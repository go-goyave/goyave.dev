const endpoint = 'https://skmobieapuatdoxigics.supabase.co/functions/v1/pageview'

export function pageView(page: string): Promise<Response> {
	if (!page.startsWith('/')) {
		page = '/' + page
	}
	return fetch(endpoint, {
		method: "POST",
		body: JSON.stringify({
			page: page || '/'
		}),
		headers: {
			"Content-Type": "application/json; charset=UTF-8"
		}
	})
}
