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
// func (p *ExampleStorageProvider) InitUpload(_ context.Context, req *port.StorageInitUploadRequest) (*port.StorageInitUploadResult, error) {
// 	// 1. If req.SHA256 != "", check for existing asset with same hash in workspace (dedup)
// 	//    → return &port.StorageInitUploadResult{Duplicate: true, Asset: &existingAsset}, nil
// 	// 2. Generate a signed PUT URL for your storage backend (GCS, S3, R2, etc.)
// 	// 3. Register a "pending" upload record with the returned UploadID
// 	// 4. Return the signed URL and metadata for the client to upload directly
// 	return &port.StorageInitUploadResult{
// 		UploadID:  "upload-123",
// 		SignedURL: "https://storage.googleapis.com/bucket/...",
// 		ObjectKey: "tenants/T1/workspaces/W1/gallery/uuid.png",
// 	}, nil
// }
//
// func (p *ExampleStorageProvider) CompleteUpload(_ context.Context, _ *port.StorageCompleteUploadRequest) (*port.StorageCompleteUploadResult, error) {
// 	// 1. Look up the pending upload by UploadID
// 	// 2. Verify the object exists in storage and is a valid image
// 	// 3. Generate a thumbnail (optional)
// 	// 4. Mark the upload as "completed" in your metadata store
// 	// 5. Idempotent: if already completed, return the cached asset
// 	return &port.StorageCompleteUploadResult{}, nil
// }
//
// func (p *ExampleStorageProvider) Delete(_ context.Context, _ *port.StorageDeleteRequest) error {
// 	// Implement: delete asset by key from storage and metadata
// 	return nil
// }
//
// func (p *ExampleStorageProvider) GetURL(_ context.Context, _ *port.StorageGetURLRequest) (*port.StorageGetURLResult, error) {
// 	// Implement: generate a signed/temporary URL for the asset
// 	return &port.StorageGetURLResult{URL: "https://..."}, nil
// }
