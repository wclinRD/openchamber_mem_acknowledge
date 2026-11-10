import { ImageModel, ImageResponse, type ImageRequestFor } from "../image.js";
import { Media } from "../media.js";
import { MediaProtocol } from "../route/media-protocol.js";
import { MediaRoute } from "../route/media.js";
import { type OpenString } from "../schema/index.js";
/** Model-defined `input` fields; `aspect` and `resolution` lower to `image_size` or `aspect_ratio` per model. */
export type FalImageOptions = {
    readonly image_size?: OpenString<"square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9"> | {
        readonly width: number;
        readonly height: number;
    };
    readonly seed?: number;
    readonly output_format?: OpenString<"jpeg" | "png" | "webp">;
    /** Inpainting mask, sent as `mask_url`. */
    readonly mask?: Media.Asset;
    readonly enable_safety_checker?: boolean;
} & Record<string, unknown>;
export type Request = ImageRequestFor<FalImageOptions>;
export declare const protocol: MediaProtocol.Queued<Request, ImageResponse, {
    readonly requestID: string;
    readonly statusURL: string;
    readonly responseURL: string;
    readonly cancelURL: string;
}>;
export declare const model: (input: MediaRoute.ModelInput) => ImageModel<FalImageOptions>;
export declare const FalImages: {
    readonly protocol: MediaProtocol.Queued<Request, ImageResponse, {
        readonly requestID: string;
        readonly statusURL: string;
        readonly responseURL: string;
        readonly cancelURL: string;
    }>;
    readonly model: typeof model;
};
