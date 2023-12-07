import { Har, Request, Response } from "har-format";

export type SanitizeOptions = {
    scrubAllRequestHeaders?: boolean;
    scrubAllCookies?: boolean;
    scrubSpecificHeader?: string[];
    scrubSpecificCookie?: string[];
    scrubAllQueryParams?: boolean;
    scrubSpecificQueryParam?: string[];
    scrubAllPostParams?: boolean;
    scrubSpecificPostParam?: string[];
    scrubAllResponseHeaders?: boolean;
    scrubSpecificResponseHeader?: string[];
    scrubAllBodyContents?: string[];
    scrubSpecificMimeTypes?: string[];
};

export function sanitizeHar(input: string, options?: SanitizeOptions): string {
    const har: Har = JSON.parse(input);

    console.log('options ', options);

    har.log.entries.forEach(entry => {
        sanitizeRequest(entry.request, options);
        sanitizeResponse(entry.response, options);
    });

    return JSON.stringify(har, null, 2);
}

function sanitizeRequest(request: Request, options: SanitizeOptions = {}) {
    // Handling headers
    if (options.scrubAllRequestHeaders) {
        request.headers = options.scrubSpecificHeader ? 
            request.headers.filter(header => options.scrubSpecificHeader?.includes(header.name.toLowerCase())) : [];
    } else if (options.scrubSpecificHeader) {
        request.headers = request.headers.filter(header => 
            !options.scrubSpecificHeader?.includes(header.name.toLowerCase()));
    }

    // Handling cookies
    if (options.scrubAllCookies) {
        request.cookies = options.scrubSpecificCookie ? 
            request.cookies.filter(cookie => options.scrubSpecificCookie?.includes(cookie.name.toLowerCase())) : [];
    } else if (options.scrubSpecificCookie) {
        request.cookies = request.cookies.filter(cookie => 
            !options.scrubSpecificCookie?.includes(cookie.name.toLowerCase()));
    }

    // Handling query parameters
    if (options.scrubAllQueryParams) {
        const url = new URL(request.url);
        if (options.scrubSpecificQueryParam) {
            for (const param of url.searchParams) {
                if (!options.scrubSpecificQueryParam.includes(param[0].toLowerCase())) {
                    url.searchParams.delete(param[0]);
                }
            }
        } else {
            url.search = '';
        }
        request.url = url.toString();
    } else if (options.scrubSpecificQueryParam) {
        request.queryString = request.queryString.filter(param => 
            !options.scrubSpecificQueryParam?.includes(param.name.toLowerCase()));
    }

    // Handling post parameters
    if (request.postData) {
        if (options.scrubAllPostParams) {
            if (options.scrubSpecificPostParam && request.postData.params) {
                request.postData.params = request.postData.params.filter(param => 
                    options.scrubSpecificPostParam?.includes(param.name.toLowerCase()));
            } else {
                request.postData.params = [];
            }
        } else if (options.scrubSpecificPostParam && request.postData.params) {
            request.postData.params = request.postData.params.filter(param => 
                !options.scrubSpecificPostParam?.includes(param.name.toLowerCase()));
        }
    }

    // Handling MIME types
    if (options.scrubSpecificMimeTypes && request.postData) {
        const mimeType = request.postData.mimeType.toLowerCase();
        if (options.scrubSpecificMimeTypes.includes(mimeType)) {
            request.postData.text = '[Content Redacted due to MIME Type]';
        }
    }
}

function sanitizeResponse(response: Response, options: SanitizeOptions = {}) {
    // Handling response headers
    if (options.scrubAllResponseHeaders) {
        response.headers = options.scrubSpecificResponseHeader ? 
            response.headers.filter(header => options.scrubSpecificResponseHeader?.includes(header.name.toLowerCase())) : [];
    } else if (options.scrubSpecificResponseHeader) {
        response.headers = response.headers.filter(header => 
            !options.scrubSpecificResponseHeader?.includes(header.name.toLowerCase()));
    }

    // Handling response body contents and MIME types
    if (response.content) {
        if (options.scrubAllBodyContents && !options.scrubSpecificMimeTypes?.includes(response.content.mimeType)) {
            response.content.text = '[Content Redacted]';
        }
        if (options.scrubSpecificMimeTypes && options.scrubSpecificMimeTypes.includes(response.content.mimeType.toLowerCase())) {
            response.content.text = '[Content Redacted due to MIME Type]';
        }
    }
}