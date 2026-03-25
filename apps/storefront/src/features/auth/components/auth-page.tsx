import { useState } from "react";

import SignInForm from "@/features/auth/components/sign-in-form.tsx";
import SignUpForm from "@/features/auth/components/sign-up-form.tsx";

export function AuthPage() {
	const [showSignIn, setShowSignIn] = useState(false);

	return showSignIn ? (
		<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
	) : (
		<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
	);
}
