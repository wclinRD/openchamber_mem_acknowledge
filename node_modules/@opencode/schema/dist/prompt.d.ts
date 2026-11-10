import { Schema } from "effect";
export interface PromptMention extends Schema.Schema.Type<typeof PromptMention> {
}
export declare const PromptMention: Schema.Struct<{
    readonly start: Schema.Finite;
    readonly end: Schema.Finite;
    readonly text: Schema.String;
}>;
export declare const FileSource: Schema.Union<readonly [Schema.Struct<{
    readonly type: Schema.Literal<"inline">;
}>, Schema.Struct<{
    readonly type: Schema.Literal<"uri">;
    readonly uri: Schema.String;
}>]>;
export type FileSource = typeof FileSource.Type;
export declare const Base64: Schema.String;
export type Base64 = typeof Base64.Type;
export interface FileAttachment extends Schema.Schema.Type<typeof FileAttachment> {
}
export declare const FileAttachment: Schema.Struct<{
    readonly data: Schema.String;
    readonly mime: Schema.String;
    readonly source: Schema.Union<readonly [Schema.Struct<{
        readonly type: Schema.Literal<"inline">;
    }>, Schema.Struct<{
        readonly type: Schema.Literal<"uri">;
        readonly uri: Schema.String;
    }>]>;
    readonly name: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
    readonly description: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
    readonly mention: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Struct<{
        readonly start: Schema.Finite;
        readonly end: Schema.Finite;
        readonly text: Schema.String;
    }>>>, Schema.optionalKey<Schema.Struct<{
        readonly start: Schema.Finite;
        readonly end: Schema.Finite;
        readonly text: Schema.String;
    }>>, never, never>;
}> & {
    create: (input: FileAttachment) => {
        readonly data: string;
        readonly mime: string;
        readonly source: {
            readonly type: "inline";
        } | {
            readonly type: "uri";
            readonly uri: string;
        };
        readonly name?: string | undefined;
        readonly description?: string | undefined;
        readonly mention?: {
            readonly start: number;
            readonly end: number;
            readonly text: string;
        } | undefined;
    };
};
/** `media:` and the lowercase hex SHA-256 of a stored blob's bytes. Names no server route. */
export declare const MediaRef: Schema.String;
export type MediaRef = typeof MediaRef.Type;
/**
 * An attachment whose bytes stay on the server, sent to clients that opt in with the experimental `experimental-media-uri`
 * capability. Fetch the bytes from `GET /api/experimental/media/:hash`.
 */
export interface MediaFileAttachment extends Schema.Schema.Type<typeof MediaFileAttachment> {
}
export declare const MediaFileAttachment: Schema.Struct<{
    readonly mime: Schema.String;
    readonly source: Schema.Union<readonly [Schema.Struct<{
        readonly type: Schema.Literal<"inline">;
    }>, Schema.Struct<{
        readonly type: Schema.Literal<"uri">;
        readonly uri: Schema.String;
    }>]>;
    readonly name: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
    readonly description: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
    readonly mention: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Struct<{
        readonly start: Schema.Finite;
        readonly end: Schema.Finite;
        readonly text: Schema.String;
    }>>>, Schema.optionalKey<Schema.Struct<{
        readonly start: Schema.Finite;
        readonly end: Schema.Finite;
        readonly text: Schema.String;
    }>>, never, never>;
    readonly uri: Schema.String;
    readonly bytes: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Int>>, Schema.optionalKey<Schema.Int>, never, never>;
    readonly width: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Int>>, Schema.optionalKey<Schema.Int>, never, never>;
    readonly height: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Int>>, Schema.optionalKey<Schema.Int>, never, never>;
}>;
export declare const Attachment: Schema.Union<readonly [Schema.Struct<{
    readonly data: Schema.String;
    readonly mime: Schema.String;
    readonly source: Schema.Union<readonly [Schema.Struct<{
        readonly type: Schema.Literal<"inline">;
    }>, Schema.Struct<{
        readonly type: Schema.Literal<"uri">;
        readonly uri: Schema.String;
    }>]>;
    readonly name: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
    readonly description: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
    readonly mention: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Struct<{
        readonly start: Schema.Finite;
        readonly end: Schema.Finite;
        readonly text: Schema.String;
    }>>>, Schema.optionalKey<Schema.Struct<{
        readonly start: Schema.Finite;
        readonly end: Schema.Finite;
        readonly text: Schema.String;
    }>>, never, never>;
}> & {
    create: (input: FileAttachment) => {
        readonly data: string;
        readonly mime: string;
        readonly source: {
            readonly type: "inline";
        } | {
            readonly type: "uri";
            readonly uri: string;
        };
        readonly name?: string | undefined;
        readonly description?: string | undefined;
        readonly mention?: {
            readonly start: number;
            readonly end: number;
            readonly text: string;
        } | undefined;
    };
}, Schema.Struct<{
    readonly mime: Schema.String;
    readonly source: Schema.Union<readonly [Schema.Struct<{
        readonly type: Schema.Literal<"inline">;
    }>, Schema.Struct<{
        readonly type: Schema.Literal<"uri">;
        readonly uri: Schema.String;
    }>]>;
    readonly name: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
    readonly description: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
    readonly mention: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Struct<{
        readonly start: Schema.Finite;
        readonly end: Schema.Finite;
        readonly text: Schema.String;
    }>>>, Schema.optionalKey<Schema.Struct<{
        readonly start: Schema.Finite;
        readonly end: Schema.Finite;
        readonly text: Schema.String;
    }>>, never, never>;
    readonly uri: Schema.String;
    readonly bytes: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Int>>, Schema.optionalKey<Schema.Int>, never, never>;
    readonly width: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Int>>, Schema.optionalKey<Schema.Int>, never, never>;
    readonly height: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Int>>, Schema.optionalKey<Schema.Int>, never, never>;
}>]>;
export type Attachment = typeof Attachment.Type;
export interface AgentAttachment extends Schema.Schema.Type<typeof AgentAttachment> {
}
export declare const AgentAttachment: Schema.Struct<{
    readonly name: Schema.String;
    readonly mention: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Struct<{
        readonly start: Schema.Finite;
        readonly end: Schema.Finite;
        readonly text: Schema.String;
    }>>>, Schema.optionalKey<Schema.Struct<{
        readonly start: Schema.Finite;
        readonly end: Schema.Finite;
        readonly text: Schema.String;
    }>>, never, never>;
}>;
export interface SkillAttachment extends Schema.Schema.Type<typeof SkillAttachment> {
}
export declare const SkillAttachment: Schema.Struct<{
    readonly id: Schema.brand<Schema.String, "Skill.ID">;
    readonly name: Schema.brand<Schema.String, "Skill.Name">;
    readonly text: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
    readonly mention: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Struct<{
        readonly start: Schema.Finite;
        readonly end: Schema.Finite;
        readonly text: Schema.String;
    }>>>, Schema.optionalKey<Schema.Struct<{
        readonly start: Schema.Finite;
        readonly end: Schema.Finite;
        readonly text: Schema.String;
    }>>, never, never>;
}>;
export interface Prompt extends Schema.Schema.Type<typeof Prompt> {
}
export declare const Prompt: Schema.Struct<{
    readonly text: Schema.String;
    readonly files: Schema.decodeTo<Schema.optional<Schema.toType<Schema.$Array<Schema.Struct<{
        readonly data: Schema.String;
        readonly mime: Schema.String;
        readonly source: Schema.Union<readonly [Schema.Struct<{
            readonly type: Schema.Literal<"inline">;
        }>, Schema.Struct<{
            readonly type: Schema.Literal<"uri">;
            readonly uri: Schema.String;
        }>]>;
        readonly name: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
        readonly description: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
        readonly mention: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Struct<{
            readonly start: Schema.Finite;
            readonly end: Schema.Finite;
            readonly text: Schema.String;
        }>>>, Schema.optionalKey<Schema.Struct<{
            readonly start: Schema.Finite;
            readonly end: Schema.Finite;
            readonly text: Schema.String;
        }>>, never, never>;
    }> & {
        create: (input: FileAttachment) => {
            readonly data: string;
            readonly mime: string;
            readonly source: {
                readonly type: "inline";
            } | {
                readonly type: "uri";
                readonly uri: string;
            };
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly mention?: {
                readonly start: number;
                readonly end: number;
                readonly text: string;
            } | undefined;
        };
    }>>>, Schema.optionalKey<Schema.$Array<Schema.Struct<{
        readonly data: Schema.String;
        readonly mime: Schema.String;
        readonly source: Schema.Union<readonly [Schema.Struct<{
            readonly type: Schema.Literal<"inline">;
        }>, Schema.Struct<{
            readonly type: Schema.Literal<"uri">;
            readonly uri: Schema.String;
        }>]>;
        readonly name: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
        readonly description: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
        readonly mention: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Struct<{
            readonly start: Schema.Finite;
            readonly end: Schema.Finite;
            readonly text: Schema.String;
        }>>>, Schema.optionalKey<Schema.Struct<{
            readonly start: Schema.Finite;
            readonly end: Schema.Finite;
            readonly text: Schema.String;
        }>>, never, never>;
    }> & {
        create: (input: FileAttachment) => {
            readonly data: string;
            readonly mime: string;
            readonly source: {
                readonly type: "inline";
            } | {
                readonly type: "uri";
                readonly uri: string;
            };
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly mention?: {
                readonly start: number;
                readonly end: number;
                readonly text: string;
            } | undefined;
        };
    }>>, never, never>;
    readonly agents: Schema.decodeTo<Schema.optional<Schema.toType<Schema.$Array<Schema.Struct<{
        readonly name: Schema.String;
        readonly mention: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Struct<{
            readonly start: Schema.Finite;
            readonly end: Schema.Finite;
            readonly text: Schema.String;
        }>>>, Schema.optionalKey<Schema.Struct<{
            readonly start: Schema.Finite;
            readonly end: Schema.Finite;
            readonly text: Schema.String;
        }>>, never, never>;
    }>>>>, Schema.optionalKey<Schema.$Array<Schema.Struct<{
        readonly name: Schema.String;
        readonly mention: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Struct<{
            readonly start: Schema.Finite;
            readonly end: Schema.Finite;
            readonly text: Schema.String;
        }>>>, Schema.optionalKey<Schema.Struct<{
            readonly start: Schema.Finite;
            readonly end: Schema.Finite;
            readonly text: Schema.String;
        }>>, never, never>;
    }>>>, never, never>;
    readonly skills: Schema.decodeTo<Schema.optional<Schema.toType<Schema.$Array<Schema.Struct<{
        readonly id: Schema.brand<Schema.String, "Skill.ID">;
        readonly name: Schema.brand<Schema.String, "Skill.Name">;
        readonly text: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
        readonly mention: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Struct<{
            readonly start: Schema.Finite;
            readonly end: Schema.Finite;
            readonly text: Schema.String;
        }>>>, Schema.optionalKey<Schema.Struct<{
            readonly start: Schema.Finite;
            readonly end: Schema.Finite;
            readonly text: Schema.String;
        }>>, never, never>;
    }>>>>, Schema.optionalKey<Schema.$Array<Schema.Struct<{
        readonly id: Schema.brand<Schema.String, "Skill.ID">;
        readonly name: Schema.brand<Schema.String, "Skill.Name">;
        readonly text: Schema.decodeTo<Schema.optional<Schema.toType<Schema.String>>, Schema.optionalKey<Schema.String>, never, never>;
        readonly mention: Schema.decodeTo<Schema.optional<Schema.toType<Schema.Struct<{
            readonly start: Schema.Finite;
            readonly end: Schema.Finite;
            readonly text: Schema.String;
        }>>>, Schema.optionalKey<Schema.Struct<{
            readonly start: Schema.Finite;
            readonly end: Schema.Finite;
            readonly text: Schema.String;
        }>>, never, never>;
    }>>>, never, never>;
}> & {
    equivalence: import("effect/Equivalence").Equivalence<{
        readonly text: string;
        readonly files?: readonly {
            readonly data: string;
            readonly mime: string;
            readonly source: {
                readonly type: "inline";
            } | {
                readonly type: "uri";
                readonly uri: string;
            };
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly mention?: {
                readonly start: number;
                readonly end: number;
                readonly text: string;
            } | undefined;
        }[] | undefined;
        readonly agents?: readonly {
            readonly name: string;
            readonly mention?: {
                readonly start: number;
                readonly end: number;
                readonly text: string;
            } | undefined;
        }[] | undefined;
        readonly skills?: readonly {
            readonly id: string & import("effect/Brand").Brand<"Skill.ID">;
            readonly name: string & import("effect/Brand").Brand<"Skill.Name">;
            readonly text?: string | undefined;
            readonly mention?: {
                readonly start: number;
                readonly end: number;
                readonly text: string;
            } | undefined;
        }[] | undefined;
    }>;
    fromUserMessage: (input: Pick<Prompt, "text" | "files" | "agents" | "skills">) => {
        readonly text: string;
        readonly files?: readonly {
            readonly data: string;
            readonly mime: string;
            readonly source: {
                readonly type: "inline";
            } | {
                readonly type: "uri";
                readonly uri: string;
            };
            readonly name?: string | undefined;
            readonly description?: string | undefined;
            readonly mention?: {
                readonly start: number;
                readonly end: number;
                readonly text: string;
            } | undefined;
        }[] | undefined;
        readonly agents?: readonly {
            readonly name: string;
            readonly mention?: {
                readonly start: number;
                readonly end: number;
                readonly text: string;
            } | undefined;
        }[] | undefined;
        readonly skills?: readonly {
            readonly id: string & import("effect/Brand").Brand<"Skill.ID">;
            readonly name: string & import("effect/Brand").Brand<"Skill.Name">;
            readonly text?: string | undefined;
            readonly mention?: {
                readonly start: number;
                readonly end: number;
                readonly text: string;
            } | undefined;
        }[] | undefined;
    };
};
