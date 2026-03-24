package store

import (
	"github.com/pkg/errors"
	"google.golang.org/protobuf/encoding/protojson"

	storepb "github.com/usememos/memos/proto/gen/store"
)

func MarshalAttachmentPayload(payload *storepb.AttachmentPayload, isBlurred bool) (string, error) {
	payloadToMarshal := &storepb.AttachmentPayload{IsBlurred: isBlurred}
	if payload != nil {
		payloadToMarshal.Payload = payload.Payload
	}

	bytes, err := protojson.Marshal(payloadToMarshal)
	if err != nil {
		return "", errors.Wrap(err, "failed to marshal attachment payload")
	}
	return string(bytes), nil
}

func UnmarshalAttachmentPayload(payloadBytes []byte) (*storepb.AttachmentPayload, bool, error) {
	payload := &storepb.AttachmentPayload{}
	if len(payloadBytes) == 0 {
		return payload, false, nil
	}

	if err := protojson.Unmarshal(payloadBytes, payload); err != nil {
		return nil, false, errors.Wrap(err, "failed to unmarshal attachment payload")
	}

	return payload, payload.GetIsBlurred(), nil
}
