//go:build script
// +build script

package main

import (
	"fmt"
	"log"
	"os"
	"sort"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
	"github.com/yuexiang/go-api/internal/config"
	"github.com/yuexiang/go-api/internal/idkit"
	"github.com/yuexiang/go-api/internal/repository"
)

func main() {
	_ = godotenv.Load()

	cfg := config.Load()
	db, err := repository.InitDB(cfg)
	if err != nil {
		log.Fatalf("connect db failed: %v", err)
	}

	if err := idkit.Bootstrap(db); err != nil {
		log.Fatalf("bootstrap idkit failed: %v", err)
	}

	batchSize := 300
	if raw := strings.TrimSpace(os.Getenv("UNIFIED_ID_BACKFILL_BATCH")); raw != "" {
		if n, parseErr := strconv.Atoi(raw); parseErr == nil && n > 0 {
			batchSize = n
		}
	}

	stats, err := idkit.BackfillMissing(db, batchSize)
	if err != nil {
		log.Fatalf("backfill failed: %v", err)
	}

	tables := make([]string, 0, len(stats))
	var total int64
	for table, count := range stats {
		tables = append(tables, table)
		total += count
	}
	sort.Strings(tables)

	log.Printf("backfill done, total=%d tables=%d", total, len(tables))
	for _, table := range tables {
		fmt.Printf("%s: %d\n", table, stats[table])
	}
}
