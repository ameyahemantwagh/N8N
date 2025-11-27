import { GlobalConfig } from '@n8n/config';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, RestController } from '@n8n/decorators';
import { NextFunction, Response } from 'express';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';

@RestController('/posthog')
export class PostHogController {
	proxy;

	constructor(private readonly globalConfig: GlobalConfig) {
		const targetUrl = this.globalConfig.diagnostics.posthogConfig.apiHost;

		this.proxy = createProxyMiddleware({
			target: targetUrl,
			changeOrigin: true,

			pathRewrite: {
				'^/posthog/': '/',
			},
			on: {
				proxyReq: (proxyReq, req) => {
					proxyReq.removeHeader('cookie');

					if (req.method === 'POST') {
						const contentType = req.headers['content-type'] ?? '';
						const expressReq = req as unknown as { body?: Record<string, unknown> };

						// Handle form-urlencoded data properly (fixRequestBody converts to JSON which breaks PostHog)
						if (contentType.includes('application/x-www-form-urlencoded') && expressReq.body) {
							console.log('FORM DATA');
							const bodyData = new URLSearchParams(
								expressReq.body as Record<string, string>,
							).toString();
							proxyReq.setHeader('Content-Type', 'application/x-www-form-urlencoded');
							proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
							proxyReq.write(bodyData);
						} else {
							fixRequestBody(proxyReq, req);
						}
					}
				},
			},
		});
	}

	// Main event capture endpoint
	@Post('/capture/', { skipAuth: true, rateLimit: { limit: 200, windowMs: 60_000 } })
	async capture(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		return await this.proxy(req, res, next);
	}

	// Feature flags and configuration
	@Post('/decide/', { skipAuth: true, rateLimit: { limit: 100, windowMs: 60_000 } })
	async decide(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		return await this.proxy(req, res, next);
	}

	// Session recording events
	@Post('/s/', { skipAuth: true, rateLimit: { limit: 50, windowMs: 60_000 } })
	async sessionRecording(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		return await this.proxy(req, res, next);
	}

	// Session recording events (alternative endpoint)
	@Post('/e/', { skipAuth: true, rateLimit: { limit: 50, windowMs: 60_000 } })
	async sessionEvents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		return await this.proxy(req, res, next);
	}

	// Person/profile updates
	@Post('/engage/', { skipAuth: true, rateLimit: { limit: 50, windowMs: 60_000 } })
	async engage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		return await this.proxy(req, res, next);
	}

	// Batch endpoint (for multiple events)
	@Post('/batch/', { skipAuth: true, rateLimit: { limit: 100, windowMs: 60_000 } })
	async batch(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		return await this.proxy(req, res, next);
	}

	// Feature flags endpoint - /flags/
	@Post('/flags/', { skipAuth: true, rateLimit: { limit: 100, windowMs: 60_000 } })
	async flags(req: AuthenticatedRequest, res: Response) {
		const targetUrl = this.globalConfig.diagnostics.posthogConfig.apiHost;
		const queryString = new URL(req.url, 'http://localhost').search;

		// Re-encode body as form-urlencoded
		const bodyData = new URLSearchParams(req.body as Record<string, string>).toString();

		const response = await fetch(`${targetUrl}/flags/${queryString}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: bodyData,
		});

		const data = await response.text();

		res.setHeader('Content-Type', 'application/json');
		return res.status(response.status).send(data);
	}

	// Static files - specific endpoint for array.js and lazy-recorder.js
	@Get('/static/array.js', {
		skipAuth: true,
		usesTemplates: true,
		rateLimit: { limit: 50, windowMs: 60_000 },
	})
	staticArrayJs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		void this.proxy(req, res, next);
	}

	@Get('/static/lazy-recorder.js', {
		skipAuth: true,
		usesTemplates: true,
		rateLimit: { limit: 50, windowMs: 60_000 },
	})
	staticLazyRecorderJs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		void this.proxy(req, res, next);
	}

	@Get('/static/surveys.js', {
		skipAuth: true,
		usesTemplates: true,
		rateLimit: { limit: 50, windowMs: 60_000 },
	})
	staticSurveysJS(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		void this.proxy(req, res, next);
	}

	// Configuration endpoints for array.js
	@Get('/array/:apiKey/config.js', {
		skipAuth: true,
		rateLimit: { limit: 20, windowMs: 60_000 },
		usesTemplates: true,
	})
	arrayConfig(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		void this.proxy(req, res, next);
	}
}
