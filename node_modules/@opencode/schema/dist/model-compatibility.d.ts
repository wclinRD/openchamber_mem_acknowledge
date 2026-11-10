import { Schema } from "effect";
export type ReasoningField = "reasoning" | "reasoning_content" | "reasoning_text" | (string & {});
export declare const ReasoningField: Schema.Codec<ReasoningField>;
export declare const MaxTokensField: Schema.Literals<readonly ["max_completion_tokens", "max_tokens"]>;
export type MaxTokensField = typeof MaxTokensField.Type;
/** Where a System One decision host reads media, from models.dev `compatibility.media_input`. */
export declare const MediaInput: Schema.Literals<readonly ["assets", "state", "root"]>;
export type MediaInput = typeof MediaInput.Type;
export declare const CacheFormat: Schema.Literals<readonly ["anthropic", "alibaba"]>;
export type CacheFormat = typeof CacheFormat.Type;
export interface Compatibility extends Schema.Schema.Type<typeof Compatibility> {
}
export declare const Compatibility: Schema.Struct<{
    /** OpenAI Chat: assistant-message field that carries reasoning. Unset uses the streamed field, else `reasoning_content`. */
    readonly reasoningField: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Codec<ReasoningField, ReasoningField, never, never>>>, Schema.optionalKey<Schema.Codec<ReasoningField, ReasoningField, never, never>>, never, never>;
    /** OpenAI Chat: send the reasoning field on every prior assistant message, even when empty. */
    readonly requireReasoning: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Boolean>>, Schema.optionalKey<Schema.Boolean>, never, never>;
    /** OpenAI Chat: body field for the output token limit. Unset detects it from the provider. */
    readonly maxTokensField: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Literals<readonly ["max_completion_tokens", "max_tokens"]>>>, Schema.optionalKey<Schema.Literals<readonly ["max_completion_tokens", "max_tokens"]>>, never, never>;
    /** OpenAI Chat: fail a stream that ends without `finish_reason`. Defaults to true. */
    readonly requireFinishReason: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Boolean>>, Schema.optionalKey<Schema.Boolean>, never, never>;
    /** OpenAI Chat: insert an assistant message between a tool result and the next user message. */
    readonly requireAssistantAfterTool: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Boolean>>, Schema.optionalKey<Schema.Boolean>, never, never>;
    /** OpenAI Chat, OpenAI Responses and Mistral: whether the endpoint accepts `prompt_cache_key`. */
    readonly supportsPromptCacheKey: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Boolean>>, Schema.optionalKey<Schema.Boolean>, never, never>;
    /** OpenAI Chat: request usage in the stream with `stream_options.include_usage`. Defaults to true. */
    readonly streamUsage: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Boolean>>, Schema.optionalKey<Schema.Boolean>, never, never>;
    /** Prompt-cache marker syntax the endpoint accepts. Overrides the route default; both send `cache_control`, and `alibaba` skips tool definitions. */
    readonly cacheFormat: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Literals<readonly ["anthropic", "alibaba"]>>>, Schema.optionalKey<Schema.Literals<readonly ["anthropic", "alibaba"]>>, never, never>;
    /** Anthropic Messages and Bedrock Converse: supports Anthropic's thinking-prefix mismatch controls. Overrides model-ID detection. */
    readonly supportsThinkingBlockBinding: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Boolean>>, Schema.optionalKey<Schema.Boolean>, never, never>;
    /** Anthropic Messages and OpenAI Responses: supports per-message effort updates. Overrides model-ID detection. */
    readonly supportsEffortUpdates: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Boolean>>, Schema.optionalKey<Schema.Boolean>, never, never>;
    /** System One: where the decision host reads media. Unset keeps the route default. */
    readonly mediaInput: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Literals<readonly ["assets", "state", "root"]>>>, Schema.optionalKey<Schema.Literals<readonly ["assets", "state", "root"]>>, never, never>;
}>;
export interface ProviderCompatibility extends Schema.Schema.Type<typeof ProviderCompatibility> {
}
export declare const ProviderCompatibility: Schema.Struct<{
    readonly reasoningField: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Codec<ReasoningField, ReasoningField, never, never>>>, Schema.optionalKey<Schema.Codec<ReasoningField, ReasoningField, never, never>>, never, never>;
    readonly requireReasoning: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Boolean>>, Schema.optionalKey<Schema.Boolean>, never, never>;
    readonly maxTokensField: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Literals<readonly ["max_completion_tokens", "max_tokens"]>>>, Schema.optionalKey<Schema.Literals<readonly ["max_completion_tokens", "max_tokens"]>>, never, never>;
    readonly requireFinishReason: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Boolean>>, Schema.optionalKey<Schema.Boolean>, never, never>;
    readonly requireAssistantAfterTool: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Boolean>>, Schema.optionalKey<Schema.Boolean>, never, never>;
    readonly supportsPromptCacheKey: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Boolean>>, Schema.optionalKey<Schema.Boolean>, never, never>;
    readonly streamUsage: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Boolean>>, Schema.optionalKey<Schema.Boolean>, never, never>;
    readonly cacheFormat: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Literals<readonly ["anthropic", "alibaba"]>>>, Schema.optionalKey<Schema.Literals<readonly ["anthropic", "alibaba"]>>, never, never>;
    readonly mediaInput: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Literals<readonly ["assets", "state", "root"]>>>, Schema.optionalKey<Schema.Literals<readonly ["assets", "state", "root"]>>, never, never>;
}>;
