import { auth, currentUser } from '@clerk/nextjs'

export default async function Dashboard() {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId) {
    return <div>Not authenticated</div>
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.firstName} {user?.lastName}!</p>

      <p>Your email is: {user?.emailAddresses[0].emailAddress}</p>
    </div>
  )
}