package service

import (
	"context"
	"github.com/yuexiang/go-api/internal/repository"
)

type FeaturedProductService interface {
	GetFeaturedProducts(ctx context.Context) (interface{}, error)
	AddFeaturedProduct(ctx context.Context, productID string, position int) error
	RemoveFeaturedProduct(ctx context.Context, id string) error
	UpdateFeaturedProductPosition(ctx context.Context, id string, position int) error
}

type featuredProductService struct {
	repo repository.FeaturedProductRepository
}

func NewFeaturedProductService(repo repository.FeaturedProductRepository) FeaturedProductService {
	return &featuredProductService{repo: repo}
}

func (s *featuredProductService) GetFeaturedProducts(ctx context.Context) (interface{}, error) {
	return s.repo.GetFeaturedProducts(ctx)
}

func (s *featuredProductService) AddFeaturedProduct(ctx context.Context, productID string, position int) error {
	resolvedProductID, err := resolveEntityID(ctx, s.repo.DB(), "products", productID)
	if err != nil {
		return err
	}
	return s.repo.AddFeaturedProduct(ctx, resolvedProductID, position)
}

func (s *featuredProductService) RemoveFeaturedProduct(ctx context.Context, id string) error {
	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "featured_products", id)
	if err != nil {
		return err
	}
	return s.repo.RemoveFeaturedProduct(ctx, resolvedID)
}

func (s *featuredProductService) UpdateFeaturedProductPosition(ctx context.Context, id string, position int) error {
	resolvedID, err := resolveEntityID(ctx, s.repo.DB(), "featured_products", id)
	if err != nil {
		return err
	}
	return s.repo.UpdateFeaturedProductPosition(ctx, resolvedID, position)
}
