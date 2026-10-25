import { Link } from 'react-router-dom';

// create-checkout sends buyers to this page after they pay.
export default function ThankYou() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-semibold">Thank you for your purchase</h1>
        <p className="text-muted-foreground">Your payment was received.</p>
        <Link to="/" className="inline-block rounded-md bg-primary px-5 py-2 text-primary-foreground">
          Back to home
        </Link>
      </div>
    </main>
  );
}
