<?php

declare(strict_types=1);

namespace GateML;

use OpenAI;
use OpenAI\Client;

/**
 * GateML PHP SDK — thin wrapper around openai-php/client.
 *
 * Usage:
 *   $client = \GateML\GateML::client('gml-sk-live_...');
 *   $response = $client->chat()->create([
 *       'model'    => 'gpt-4o',
 *       'messages' => [['role' => 'user', 'content' => 'Hello!']],
 *   ]);
 *   echo $response->choices[0]->message->content;
 */
final class GateML
{
    public const GATEWAY_URL = 'https://api.gateml.io/v1';

    /**
     * Returns a config array for use with OpenAI::factory() or OpenAI::client().
     *
     * @return array{api_key: string, base_uri: string}
     */
    public static function config(string $apiKey, string $baseUrl = self::GATEWAY_URL): array
    {
        return ['api_key' => $apiKey, 'base_uri' => $baseUrl . '/'];
    }

    /**
     * Returns a configured OpenAI\Client routed through GateML.
     */
    public static function client(string $apiKey, string $baseUrl = self::GATEWAY_URL): Client
    {
        $cfg = self::config($apiKey, $baseUrl);
        return OpenAI::factory()
            ->withApiKey($cfg['api_key'])
            ->withBaseUri($cfg['base_uri'])
            ->make();
    }
}
