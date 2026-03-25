package service

import (
	"context"
	"errors"
	"path/filepath"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
	"gorm.io/gorm"
)

func newDiningBuddyServiceForTest(t *testing.T) (*DiningBuddyService, *gorm.DB) {
	t.Helper()

	dbPath := filepath.Join(t.TempDir(), "dining_buddy_service_test.db")
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("resolve sql db failed: %v", err)
	}
	t.Cleanup(func() {
		_ = sqlDB.Close()
	})

	if err := db.AutoMigrate(
		&repository.IDCodebook{},
		&repository.IDSequence{},
		&repository.IDLegacyMapping{},
		&repository.User{},
		&repository.DiningBuddyParty{},
		&repository.DiningBuddyPartyMember{},
		&repository.DiningBuddyMessage{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}
	if err := idkit.Bootstrap(db); err != nil {
		t.Fatalf("bootstrap idkit failed: %v", err)
	}

	return NewDiningBuddyService(db), db
}

func TestDiningBuddyCreateJoinAndMessageFlow(t *testing.T) {
	svc, db := newDiningBuddyServiceForTest(t)
	ctx := context.Background()

	host := repository.User{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072400000001"},
		Phone:           "13800000001",
		Name:            "发起人",
		Type:            "customer",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	member := repository.User{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072400000002"},
		Phone:           "13800000002",
		Name:            "加入者",
		Type:            "customer",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	viewer := repository.User{
		UnifiedIdentity: repository.UnifiedIdentity{UID: "25072400000003"},
		Phone:           "13800000003",
		Name:            "旁观者",
		Type:            "customer",
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := db.Create(&host).Error; err != nil {
		t.Fatalf("seed host failed: %v", err)
	}
	if err := db.Create(&member).Error; err != nil {
		t.Fatalf("seed member failed: %v", err)
	}
	if err := db.Create(&viewer).Error; err != nil {
		t.Fatalf("seed viewer failed: %v", err)
	}

	createdParty, err := svc.CreateParty(ctx, host.ID, DiningBuddyCreatePartyInput{
		Category:    "food",
		Title:       "火锅搭子局",
		Location:    "万象城",
		Time:        "周五 19:00",
		Description: "想找 2-4 人一起吃火锅",
		MaxPeople:   4,
	})
	if err != nil {
		t.Fatalf("CreateParty failed: %v", err)
	}
	if createdParty.Joined != true {
		t.Fatalf("expected host joined created party")
	}

	parties, err := svc.ListParties(ctx, member.ID, "", 20)
	if err != nil {
		t.Fatalf("ListParties failed: %v", err)
	}
	if len(parties) != 1 {
		t.Fatalf("expected 1 party, got %d", len(parties))
	}
	if parties[0].Title != "火锅搭子局" {
		t.Fatalf("unexpected party title: %q", parties[0].Title)
	}

	joinedParty, err := svc.JoinParty(ctx, member.ID, createdParty.ID)
	if err != nil {
		t.Fatalf("JoinParty failed: %v", err)
	}
	if !joinedParty.Joined {
		t.Fatalf("expected joined flag true after join")
	}
	if joinedParty.Current != 2 {
		t.Fatalf("expected current members 2, got %d", joinedParty.Current)
	}

	sentMessage, err := svc.SendMessage(ctx, member.ID, createdParty.ID, DiningBuddySendMessageInput{
		Content: "我这边可以准时到。",
	})
	if err != nil {
		t.Fatalf("SendMessage failed: %v", err)
	}
	if sentMessage.Sender != "me" {
		t.Fatalf("expected sender me, got %q", sentMessage.Sender)
	}

	messages, err := svc.ListMessages(ctx, host.ID, createdParty.ID)
	if err != nil {
		t.Fatalf("ListMessages failed: %v", err)
	}
	if len(messages) < 3 {
		t.Fatalf("expected at least 3 messages, got %d", len(messages))
	}
	if messages[len(messages)-1].Text != "我这边可以准时到。" {
		t.Fatalf("unexpected last message: %q", messages[len(messages)-1].Text)
	}
	if messages[len(messages)-1].Sender != "other" {
		t.Fatalf("expected host view sender other, got %q", messages[len(messages)-1].Sender)
	}

	_, err = svc.ListMessages(ctx, viewer.ID, createdParty.ID)
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected ErrForbidden for non-member, got %v", err)
	}
}
