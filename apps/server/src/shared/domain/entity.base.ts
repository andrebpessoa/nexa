import type { Brand } from "./brand.ts";

export abstract class Entity<TId extends Brand<string, string>, TProps> {
	constructor(
		private readonly _id: TId,
		protected props: TProps,
	) {}

	get id(): TId {
		return this._id;
	}

	get idValue(): string {
		return this._id;
	}

	equals(other: Entity<TId, TProps>): boolean {
		return this.idValue === other.idValue;
	}
}
