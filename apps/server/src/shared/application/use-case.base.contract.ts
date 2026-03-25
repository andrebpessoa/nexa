import type { UseCase } from "./use-case.base.ts";

declare const noInput: UseCase<string>;
declare const withInput: UseCase<string, { id: string }>;

noInput.execute();
noInput.execute(undefined);
// @ts-expect-error withInput must require an argument
withInput.execute();
withInput.execute({ id: "1" });
