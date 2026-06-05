# frozen_string_literal: true

require "openai"

# GateML Ruby SDK
#
# Drop-in replacement for ruby-openai that routes through the GateML gateway.
#
# @example
#   require 'gateml'
#
#   client = GateML.client(api_key: 'gml-sk-live_...')
#   response = client.chat(
#     parameters: { model: 'gpt-4o', messages: [{ role: 'user', content: 'Hello!' }] }
#   )
#   puts response.dig('choices', 0, 'message', 'content')
module GateML
  GATEWAY_URL = "https://api.gateml.io/v1"

  # Returns a hash of options to pass to OpenAI::Client.new
  #
  # @param api_key [String] your GateML API key
  # @param base_url [String] override the gateway URL
  # @return [Hash]
  def self.config(api_key:, base_url: GATEWAY_URL)
    { access_token: api_key, uri_base: base_url }
  end

  # Returns a configured OpenAI::Client routed through GateML.
  #
  # @param api_key [String] your GateML API key
  # @param base_url [String] override the gateway URL
  # @return [OpenAI::Client]
  def self.client(api_key:, base_url: GATEWAY_URL)
    OpenAI::Client.new(**config(api_key: api_key, base_url: base_url))
  end
end
