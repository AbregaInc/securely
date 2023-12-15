// src/scrubHarFunction.ts
import Resolver from '@forge/resolver';
import { sanitize } from "./har_sanitize"; // Import your sanitize function
import { jsonError } from "./_resp"; // Import your jsonError helper function

// Define your request structure
interface ScrubRequest {
    har: string;
    words?: string[];
    mime_types?: string[];
    all_headers?: boolean;
    all_cookies?: boolean;
    all_mimetypes?: boolean;
    all_queryargs?: boolean;
    all_postparams?: boolean;
}

const resolver = new Resolver();

resolver.define('scrub', async ({ payload }) => {

    let body: ScrubRequest | null;
	try {
		body = await payload as ScrubRequest;
	} catch (e) {
		console.log(e);
		return jsonError("failed to parse json body");
	}

	if (!body) {
		return jsonError("missing post body");
	}

	if (!body.har) {
		return jsonError("body should be json and have a har field");
	}


    try {
        const harInput = JSON.stringify(body.har, null, 2);
        const scrubbed = sanitize(harInput, {
            scrubWords: body.words,
            scrubMimetypes: body.mime_types,
            allCookies: body.all_cookies,
            allHeaders: body.all_headers,
            allMimeTypes: body.all_mimetypes,
            allQueryArgs: body.all_queryargs,
            allPostParams: body.all_postparams,
        });

        return JSON.parse(scrubbed);
    } catch (e) {
        // Properly handle the error of unknown type
        if (e instanceof Error) {
            console.warn(e);
            return jsonError(`Failed to scrub HAR file: ${e.message}`, 500);
        } else {
            // Handle non-Error objects
            console.warn('An unexpected error occurred:', e);
            return jsonError('An unexpected error occurred', 500);
        }
    }
});

export const handler = resolver.getDefinitions();
