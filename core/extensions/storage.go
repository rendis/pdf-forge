package extensions

// ExampleStorageProvider is a commented-out example of a StorageProvider implementation.
// Uncomment and customize for your use case (e.g., AWS S3, GCS, local filesystem).
//
// import (
// 	"context"
// 	"github.com/rendis/pdf-forge/core/internal/core/port"
// )
//
// type ExampleStorageProvider struct {
// 	// Add your storage client fields here (e.g., S3 client, bucket name)
// }
//
// func (p *ExampleStorageProvider) List(_ context.Context, _ *port.StorageListRequest) (*port.StorageListResult, error) {
// 	// Implement: list assets in the workspace's storage path
// 	return &port.StorageListResult{}, nil
// }
//
// func (p *ExampleStorageProvider) Search(_ context.Context, _ *port.StorageSearchRequest) (*port.StorageListResult, error) {
// 	// Implement: search/filter assets by name
// 	return &port.StorageListResult{}, nil
// }
//
// func (p *ExampleStorageProvider) Upload(_ context.Context, _ *port.StorageUploadRequest) (*port.StorageUploadResult, error) {
// 	// Implement: upload file from req.Body to your storage backend
// 	return &port.StorageUploadResult{}, nil
// }
//
// func (p *ExampleStorageProvider) Delete(_ context.Context, _ *port.StorageDeleteRequest) error {
// 	// Implement: delete asset by key
// 	return nil
// }
//
// func (p *ExampleStorageProvider) GetURL(_ context.Context, _ *port.StorageGetURLRequest) (*port.StorageGetURLResult, error) {
// 	// Implement: generate a signed/temporary URL for the asset
// 	return &port.StorageGetURLResult{URL: "https://..."}, nil
// }
