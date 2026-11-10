import { Schema } from "effect";
import { ImageModel, ImageResponse, type ImageRequestFor } from "../image.js";
import { Media } from "../media.js";
import { MediaProtocol } from "../route/media-protocol.js";
import { MediaRoute } from "../route/media.js";
import { type OpenString } from "../schema/index.js";
export declare const DEFAULT_BASE_URL = "https://api.bfl.ai";
/** Native body fields; `aspect` and `resolution` lower to `width`/`height` or `aspect_ratio` depending on the model. */
export type BlackForestLabsImageOptions = {
    readonly width?: number;
    readonly height?: number;
    readonly seed?: number;
    readonly output_format?: OpenString<"jpeg" | "png" | "webp">;
    /** Inpainting mask for `flux-pro-1.0-fill`. */
    readonly mask?: Media.Asset;
    readonly safety_tolerance?: number;
    readonly prompt_upsampling?: boolean;
    readonly disable_pup?: boolean;
    readonly raw?: boolean;
    readonly guidance?: number;
    readonly steps?: number;
} & Record<string, unknown>;
export type Request = ImageRequestFor<BlackForestLabsImageOptions>;
/**
 * Regional clusters answer on different hosts, so the returned `polling_url` is followed verbatim. BFL reports the
 * credit cost on submit, so it rides on the token; it is optional so tokens persisted before it existed still decode.
 */
export declare const Token: Schema.Struct<{
    readonly id: Schema.String;
    readonly pollingURL: Schema.String;
    readonly cost: Schema.optionalKey<Schema.Number>;
}>;
export type Token = Schema.Schema.Type<typeof Token>;
export declare const protocol: MediaProtocol.Queued<Request, ImageResponse, {
    readonly id: string;
    readonly pollingURL: string;
    readonly cost?: number | undefined;
}>;
export declare const model: (input: MediaRoute.ModelInput) => ImageModel<BlackForestLabsImageOptions>;
export declare const BlackForestLabsImages: {
    readonly protocol: MediaProtocol.Queued<Request, ImageResponse, {
        readonly id: string;
        readonly pollingURL: string;
        readonly cost?: number | undefined;
    }>;
    readonly model: typeof model;
};
