import type { Result } from "neverthrow";
import type { DomainError } from "../domain/errors/index.ts";

export interface UseCase<
	Output,
	Input = void,
	Error extends DomainError = DomainError,
> {
	execute(
		...args: [Input] extends [undefined] ? [] : [input: Input]
	): Promise<Result<Output, Error>>;
}
