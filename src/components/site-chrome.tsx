import Link from "next/link";
import { Menu } from "lucide-react";
import { ButtonLink, cx } from "@/components/ui";

export function Logo({ className }: { className?: string }) {
	return (
		<Link
			href="/"
			aria-label="SYNAPSE home"
			className={cx("inline-flex min-h-12 items-center gap-2", className)}
		>
			<svg
				viewBox="0 0 36 36"
				aria-hidden="true"
				className="size-9"
			>
				<circle cx="14" cy="18" r="10" fill="var(--color-clay)" />
				<circle cx="22" cy="18" r="10" fill="var(--color-sage)" fillOpacity="0.85" />
				<circle cx="18" cy="18" r="3" fill="var(--color-honey)" />
			</svg>
			<span className="font-display text-2xl font-semibold tracking-tight text-ink">
				SYNAPSE
			</span>
		</Link>
	);
}

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
	return (
		<header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
			<div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
				<Logo />
				<nav aria-label="Main" className="hidden md:flex gap-1">
					<Link
						href="/#how-it-works"
						className="inline-flex min-h-12 items-center px-3 font-semibold text-ink-soft hover:text-ink"
					>
						How it works
					</Link>
					<Link
						href="/#activities"
						className="inline-flex min-h-12 items-center px-3 font-semibold text-ink-soft hover:text-ink"
					>
						Activities
					</Link>
					<Link
						href="/#pricing"
						className="inline-flex min-h-12 items-center px-3 font-semibold text-ink-soft hover:text-ink"
					>
						Pricing
					</Link>
					<Link
						href="/#faq"
						className="inline-flex min-h-12 items-center px-3 font-semibold text-ink-soft hover:text-ink"
					>
						FAQ
					</Link>
				</nav>
				<div className="flex items-center gap-2">
					{signedIn ? (
						<ButtonLink href="/dashboard" className="whitespace-nowrap">
							My space
						</ButtonLink>
					) : (
						<>
							<ButtonLink variant="quiet" href="/login">
								Log in
							</ButtonLink>
							<ButtonLink href="/signup" className="hidden sm:inline-flex">
								Start Connecting
							</ButtonLink>
						</>
					)}
					<details className="md:hidden">
						<summary
							className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-control border-2 border-ink cursor-pointer list-none [&::-webkit-details-marker]:hidden"
						>
							<Menu aria-hidden="true" className="size-5" />
							<span className="sr-only">Menu</span>
						</summary>
						<div className="absolute left-4 right-4 top-full mt-2 rounded-card bg-surface p-4 shadow-lift">
							<Link
								href="/#how-it-works"
								className="block min-h-12 py-3 text-lg font-semibold"
							>
								How it works
							</Link>
							<Link
								href="/#activities"
								className="block min-h-12 py-3 text-lg font-semibold"
							>
								Activities
							</Link>
							<Link
								href="/#pricing"
								className="block min-h-12 py-3 text-lg font-semibold"
							>
								Pricing
							</Link>
							<Link
								href="/#faq"
								className="block min-h-12 py-3 text-lg font-semibold"
							>
								FAQ
							</Link>
							{!signedIn && (
								<ButtonLink
									href="/signup"
									className="w-full mt-2"
								>
									Start Connecting
								</ButtonLink>
							)}
						</div>
					</details>
				</div>
			</div>
		</header>
	);
}

export function SiteFooter() {
	const year = new Date().getFullYear();
	return (
		<footer className="border-t border-line">
			<div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 grid gap-8 sm:grid-cols-3">
				<div className="flex flex-col items-start gap-3">
					<Logo />
					<p className="text-ink-soft">
						Helping generations stay close, one conversation at a time.
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<h2 className="font-sans text-base font-semibold">Explore</h2>
					<div className="flex flex-col gap-2">
						<Link href="/#how-it-works" className="text-ink-soft hover:text-ink">
							How it works
						</Link>
						<Link href="/#pricing" className="text-ink-soft hover:text-ink">
							Pricing
						</Link>
						<Link href="/#faq" className="text-ink-soft hover:text-ink">
							FAQ
						</Link>
						<Link href="/login" className="text-ink-soft hover:text-ink">
							Log in
						</Link>
					</div>
				</div>
				<div className="flex flex-col gap-2">
					<h2 className="font-sans text-base font-semibold">Privacy</h2>
					<p className="text-ink-soft">
						Your Connection Space is private to the two of you. We never sell your data or show ads.
					</p>
				</div>
			</div>
			<p className="text-sm text-ink-muted border-t border-line pt-6 mt-8">
				© {year} SYNAPSE. Built with care for every generation.
			</p>
		</footer>
	);
}