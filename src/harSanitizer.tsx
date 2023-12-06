import { Har, Request, Response } from "har-format";

export type SanitizeOptions = {
    scrubAllRequestHeaders?: boolean;
    scrubAllCookies?: boolean;
    scrubSpecificHeader?: string[];
    scrubAllQueryParams?: boolean;
    scrubSpecificQueryParam?: string[];
    scrubAllPostParams?: boolean;
    scrubSpecificPostParam?: string[];
    scrubAllResponseHeaders?: boolean;
    scrubSpecificResponseHeader?: string[];
    scrubBodyContents?: string[];
    scrubSpecificMimeTypes?: string[];
    allowlist?: boolean;
};

export function sanitizeHar(input: string, options?: SanitizeOptions): string {
    const har: Har = JSON.parse(input);

    har.log.entries.forEach(entry => {
        sanitizeRequest(entry.request, options);
        sanitizeResponse(entry.response, options);
    });

    return JSON.stringify(har, null, 2);
}

function sanitizeRequest(request: Request, options: SanitizeOptions = {}) {
    if (options.scrubAllRequestHeaders) {
        request.headers = [];
    } else if (options.scrubSpecificHeader) {
        request.headers = request.headers.filter(header => 
            !options.scrubSpecificHeader?.includes(header.name.toLowerCase()));
    }

    if (options.scrubAllCookies) {
        request.cookies = [];
    }

    if (options.scrubAllQueryParams) {
        request.queryString = [];
    } else if (options.scrubSpecificQueryParam) {
        request.queryString = request.queryString.filter(param => 
            !options.scrubSpecificQueryParam?.includes(param.name.toLowerCase()));
    }

    if (request.postData) {
        if (options.scrubAllPostParams) {
            request.postData.params = [];
        } else if (options.scrubSpecificPostParam && request.postData.params) {
            request.postData.params = request.postData.params.filter(param => 
                !options.scrubSpecificPostParam?.includes(param.name.toLowerCase()));
        }
    }

    if (options.scrubSpecificMimeTypes && request.postData) {
        const mimeType = request.postData.mimeType.toLowerCase();
        if (options.scrubSpecificMimeTypes.includes(mimeType)) {
            request.postData.text = '[Content Redacted due to MIME Type]';
            // Optionally clear postData.params if it exists
            if (request.postData.params) {
                request.postData.params = [];
            }
        }
    }
}

function sanitizeResponse(response: Response, options: SanitizeOptions = {}) {
    if (options.scrubAllResponseHeaders) {
        response.headers = [];
    } else if (options.scrubSpecificResponseHeader) {
        response.headers = response.headers.filter(header => 
            !options.scrubSpecificResponseHeader?.includes(header.name.toLowerCase()));
    }

    if (response.content && options.scrubBodyContents && !options.scrubBodyContents.includes(response.content.mimeType)) {
        response.content.text = '[Content Redacted]';
    }
    if (options.scrubSpecificMimeTypes && response.content) {
        const mimeType = response.content.mimeType.toLowerCase();
        if (options.scrubSpecificMimeTypes.includes(mimeType)) {
            response.content.text = '[Content Redacted due to MIME Type]';
        }
    }
}