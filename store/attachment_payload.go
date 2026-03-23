package store

import (
	"encoding/json"

	"github.com/pkg/errors"
	"google.golang.org/protobuf/encoding/protojson"

	storepb "github.com/usememos/memos/proto/gen/store"
)

const (
	attachmentPayloadKeyS3Object  = "s3Object"
	attachmentPayloadKeyS3Object2 = "s3_object"
	attachmentPayloadKeyBlurred   = "isBlurred"
	attachmentPayloadKeyBlurred2  = "is_blurred"
)

func MarshalAttachmentPayload(payload *storepb.AttachmentPayload, isBlurred bool) (string, error) {
	result := map[string]json.RawMessage{}

	if payload != nil {
		if s3Object := payload.GetS3Object(); s3Object != nil {
			bytes, err := protojson.Marshal(s3Object)
			if err != nil {
				return "", errors.Wrap(err, "failed to marshal attachment s3 payload")
			}
			result[attachmentPayloadKeyS3Object] = bytes
		}
	}

	if isBlurred {
		result[attachmentPayloadKeyBlurred] = json.RawMessage("true")
	}

	if len(result) == 0 {
		return "{}", nil
	}

	bytes, err := json.Marshal(result)
	if err != nil {
		return "", errors.Wrap(err, "failed to marshal attachment payload envelope")
	}
	return string(bytes), nil
}

func UnmarshalAttachmentPayload(payloadBytes []byte) (*storepb.AttachmentPayload, bool, error) {
	payload := &storepb.AttachmentPayload{}
	if len(payloadBytes) == 0 {
		return payload, false, nil
	}

	envelope := map[string]json.RawMessage{}
	if err := json.Unmarshal(payloadBytes, &envelope); err != nil {
		return nil, false, errors.Wrap(err, "failed to unmarshal attachment payload envelope")
	}

	s3ObjectBytes := envelope[attachmentPayloadKeyS3Object]
	if len(s3ObjectBytes) == 0 {
		s3ObjectBytes = envelope[attachmentPayloadKeyS3Object2]
	}
	if len(s3ObjectBytes) > 0 {
		s3Object := &storepb.AttachmentPayload_S3Object{}
		if err := protojson.Unmarshal(s3ObjectBytes, s3Object); err != nil {
			return nil, false, errors.Wrap(err, "failed to unmarshal attachment s3 payload")
		}
		payload.Payload = &storepb.AttachmentPayload_S3Object_{S3Object: s3Object}
	}

	var isBlurred bool
	blurredBytes := envelope[attachmentPayloadKeyBlurred]
	if len(blurredBytes) == 0 {
		blurredBytes = envelope[attachmentPayloadKeyBlurred2]
	}
	if len(blurredBytes) > 0 {
		if err := json.Unmarshal(blurredBytes, &isBlurred); err != nil {
			return nil, false, errors.Wrap(err, "failed to unmarshal attachment blurred flag")
		}
	}

	return payload, isBlurred, nil
}
