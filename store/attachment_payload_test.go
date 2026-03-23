package store

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/types/known/timestamppb"

	storepb "github.com/usememos/memos/proto/gen/store"
)

func TestUnmarshalAttachmentPayload_BackwardCompatibleEmptyPayload(t *testing.T) {
	payload, isBlurred, err := UnmarshalAttachmentPayload([]byte(`{}`))
	require.NoError(t, err)
	require.NotNil(t, payload)
	require.Nil(t, payload.GetS3Object())
	require.False(t, isBlurred)
}

func TestMarshalAndUnmarshalAttachmentPayload_PreservesS3DataAndBlurState(t *testing.T) {
	originalPayload := &storepb.AttachmentPayload{
		Payload: &storepb.AttachmentPayload_S3Object_{
			S3Object: &storepb.AttachmentPayload_S3Object{
				Key:               "attachments/test-image.png",
				LastPresignedTime: timestamppb.New(time.Unix(1_700_000_000, 0)),
			},
		},
	}

	payloadString, err := MarshalAttachmentPayload(originalPayload, true)
	require.NoError(t, err)

	decodedPayload, isBlurred, err := UnmarshalAttachmentPayload([]byte(payloadString))
	require.NoError(t, err)
	require.True(t, isBlurred)
	require.NotNil(t, decodedPayload.GetS3Object())
	require.Equal(t, originalPayload.GetS3Object().Key, decodedPayload.GetS3Object().Key)
	require.True(t, originalPayload.GetS3Object().LastPresignedTime.AsTime().Equal(decodedPayload.GetS3Object().LastPresignedTime.AsTime()))
}
