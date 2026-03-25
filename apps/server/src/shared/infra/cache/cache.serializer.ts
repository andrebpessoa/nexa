interface SerializedResult<T> {
	ok: true;
	value: T;
}

const ISO_DATE_TIME_UTC_REGEX =
	/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

function reviveIsoDateStrings(_key: string, value: unknown): unknown {
	if (typeof value === "string" && ISO_DATE_TIME_UTC_REGEX.test(value)) {
		const timestamp = Date.parse(value);
		if (!Number.isNaN(timestamp)) {
			return new Date(timestamp);
		}
	}

	return value;
}

export function serializeResult(value: unknown): string {
	const payload: SerializedResult<unknown> = { ok: true, value };
	return JSON.stringify(payload);
}

export function deserializeResult<T>(raw: string): T | null {
	try {
		const parsed: unknown = JSON.parse(raw, reviveIsoDateStrings);

		if (!isSerializedResult(parsed)) {
			return null;
		}

		return parsed.value as T;
	} catch {
		return null;
	}
}

function isSerializedResult(
	value: unknown,
): value is SerializedResult<unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		"ok" in value &&
		value.ok === true &&
		"value" in value
	);
}
