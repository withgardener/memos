package s3

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go/middleware"
	smithyhttp "github.com/aws/smithy-go/transport/http"
	"github.com/pkg/errors"

	storepb "github.com/usememos/memos/proto/gen/store"
)

type Client struct {
	Client *s3.Client
	Bucket *string
}

type PresignGetObjectOptions struct {
	QueryKey   string
	QueryValue string
}

func NewClient(ctx context.Context, s3Config *storepb.StorageS3Config) (*Client, error) {
	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(s3Config.AccessKeyId, s3Config.AccessKeySecret, "")),
		config.WithRegion(s3Config.Region),
	)
	if err != nil {
		return nil, errors.Wrap(err, "failed to load s3 config")
	}

	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(s3Config.Endpoint)
		o.UsePathStyle = s3Config.UsePathStyle
		o.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
		o.ResponseChecksumValidation = aws.ResponseChecksumValidationWhenRequired
	})
	return &Client{
		Client: client,
		Bucket: aws.String(s3Config.Bucket),
	}, nil
}

// UploadObject uploads an object to S3.
func (c *Client) UploadObject(ctx context.Context, key string, fileType string, filename string, cacheControl string, content io.Reader) (string, error) {
	uploader := manager.NewUploader(c.Client)
	putInput := s3.PutObjectInput{
		Bucket:             c.Bucket,
		Key:                aws.String(key),
		ContentType:        aws.String(fileType),
		ContentDisposition: aws.String(fmt.Sprintf("inline; filename=%q", filename)),
		CacheControl:       aws.String(cacheControl),
		Body:               content,
	}
	result, err := uploader.Upload(ctx, &putInput)
	if err != nil {
		return "", err
	}

	resultKey := result.Key
	if resultKey == nil || *resultKey == "" {
		return "", errors.New("failed to get file key")
	}
	return *resultKey, nil
}

// PresignGetObject presigns an object in S3.
func (c *Client) PresignGetObject(ctx context.Context, key string, presignOptions *PresignGetObjectOptions) (string, error) {
	presignClient := s3.NewPresignClient(c.Client)
	presignResult, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(*c.Bucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = 24 * time.Hour
		if presignOptions != nil && presignOptions.QueryKey != "" && presignOptions.QueryValue != "" {
			opts.ClientOptions = append(opts.ClientOptions, func(o *s3.Options) {
				o.APIOptions = append(o.APIOptions, addQueryParamMiddleware(presignOptions.QueryKey, presignOptions.QueryValue))
			})
		}
	})
	if err != nil {
		return "", errors.Wrap(err, "failed to presign get object")
	}
	return presignResult.URL, nil
}

func addQueryParamMiddleware(queryKey, queryValue string) func(*middleware.Stack) error {
	return func(stack *middleware.Stack) error {
		return stack.Build.Add(middleware.BuildMiddlewareFunc("MemosS3ImageProcessingQuery", func(ctx context.Context, input middleware.BuildInput, next middleware.BuildHandler) (
			output middleware.BuildOutput, metadata middleware.Metadata, err error,
		) {
			request, ok := input.Request.(*smithyhttp.Request)
			if !ok {
				return output, metadata, fmt.Errorf("unexpected request type %T", input.Request)
			}
			query := request.URL.Query()
			query.Set(queryKey, queryValue)
			request.URL.RawQuery = query.Encode()
			return next.HandleBuild(ctx, input)
		}), middleware.After)
	}
}

// GetObject retrieves an object from S3.
func (c *Client) GetObject(ctx context.Context, key string) ([]byte, error) {
	downloader := manager.NewDownloader(c.Client)
	buffer := manager.NewWriteAtBuffer([]byte{})
	_, err := downloader.Download(ctx, buffer, &s3.GetObjectInput{
		Bucket: c.Bucket,
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to download object")
	}
	return buffer.Bytes(), nil
}

// GetObjectStream retrieves an object from S3 as a stream.
func (c *Client) GetObjectStream(ctx context.Context, key string) (io.ReadCloser, error) {
	output, err := c.Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: c.Bucket,
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to get object")
	}
	return output.Body, nil
}

// DeleteObject deletes an object in S3.
func (c *Client) DeleteObject(ctx context.Context, key string) error {
	_, err := c.Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: c.Bucket,
		Key:    aws.String(key),
	})
	if err != nil {
		return errors.Wrap(err, "failed to delete object")
	}
	return nil
}
