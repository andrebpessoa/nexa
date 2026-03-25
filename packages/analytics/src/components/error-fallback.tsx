import type { ErrorBoundaryFallbackProps } from "../types.ts";

export function ErrorFallback({
	error,
	resetError,
	reportUrl,
}: ErrorBoundaryFallbackProps & { reportUrl?: string }) {
	return (
		<div className="flex min-h-svh flex-col items-center justify-center gap-6 p-8 text-center">
			<div className="flex flex-col gap-2">
				<h1 className="font-semibold text-2xl">Algo deu errado</h1>
				<p className="max-w-md text-muted-foreground">
					Ocorreu um erro inesperado. Tente novamente ou entre em contato com o
					suporte se o problema persistir.
				</p>
				<p className="font-mono text-muted-foreground/70 text-sm">
					{error.message}
				</p>
			</div>
			<div className="flex gap-3">
				<button
					type="button"
					onClick={resetError}
					className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm hover:bg-primary/90"
				>
					Tentar novamente
				</button>
				{reportUrl && (
					<a
						href={reportUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="rounded-md border border-input bg-background px-4 py-2 font-medium text-sm hover:bg-accent hover:text-accent-foreground"
					>
						Reportar problema
					</a>
				)}
			</div>
		</div>
	);
}
