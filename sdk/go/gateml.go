// Package gateml provides a thin wrapper around the openai-go client
// that points all requests at the GateML gateway.
//
// Usage:
//
//	client := gateml.NewClient("gml-sk-live_...")
//	resp, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{...})
package gateml

import (
	"github.com/openai/openai-go"
	"github.com/openai/openai-go/option"
)

const DefaultBaseURL = "https://api.gateml.io/v1"

// NewClient returns an openai.Client configured to route through GateML.
// The client API is identical to the standard openai-go client.
func NewClient(apiKey string, opts ...option.RequestOption) *openai.Client {
	baseOpts := []option.RequestOption{
		option.WithAPIKey(apiKey),
		option.WithBaseURL(DefaultBaseURL),
	}
	return openai.NewClient(append(baseOpts, opts...)...)
}
