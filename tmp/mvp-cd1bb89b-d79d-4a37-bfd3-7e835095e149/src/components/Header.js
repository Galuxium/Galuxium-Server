import Link from 'next/link';
import { UserButton, auth } from '@clerk/nextjs';

export default async function Header() {
    const { userId } = auth();

    return (
        <header className="bg-white shadow">
            <div className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">AuraSound</h1>

                <nav>
                    <ul className="flex space-x-4">
                        <li>
                            <Link href="/" className="text-gray-500 hover:text-gray-900">Home</Link>
                        </li>
                        <li>
                            <Link href="/about" className="text-gray-500 hover:text-gray-900">About</Link>
                        </li>
                        {
                            userId ? (
                                <li>
                                    <Link href="/dashboard" className="text-gray-500 hover:text-gray-900">Dashboard</Link>
                                </li>
                            ) : null
                        }

                    </ul>
                </nav>

                <UserButton afterSignOutUrl="/"/>
            </div>
        </header>
    );
}