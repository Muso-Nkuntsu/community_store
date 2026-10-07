import { useApp } from "../context/AppContext.jsx";

// "How it works" page (#/about). New visitors are pointed here from the welcome banner,
// and new accounts land here straight after registering.
export default function About() {
  const { user } = useApp();

  // Each step sends the person to the right place. Pages that need an account go to register first.
  const steps = [
    {
      n: 1,
      title: "Look around",
      text: "Search by keyword or filter by category. Anyone can browse, no account needed.",
      href: "#/",
      cta: "Browse listings",
    },
    {
      n: 2,
      title: user ? "Check your profile" : "Create your account",
      text: user
        ? "Make sure your email and phone number are right. Buyers use them to reach you."
        : "Register with your name and email. A student ID and phone number are optional.",
      href: user ? "#/dashboard" : "#/register",
      cta: user ? "Open my dashboard" : "Register",
    },
    {
      n: 3,
      title: "Sell something",
      text: "Add a title, description, price and category, and upload a photo so buyers can see it.",
      href: user ? "#/sell" : "#/register",
      cta: "Create a listing",
    },
    {
      n: 4,
      title: "Save what you like",
      text: "Open a listing and save it to your wishlist to find it again later.",
      href: user ? "#/wishlist" : "#/register",
      cta: "My wishlist",
    },
  ];

  return (
    <div className="wrap sec">
      <h2>{user ? "Welcome, " + user.name.split(" ")[0] : "Welcome to Community Store"}</h2>
      <p className="lead">
        A marketplace for students, staff and neighbours to buy and sell textbooks, electronics,
        furniture, clothing and services. Here is how to get started.
      </p>

      <ol className="steps">
        {steps.map((s) => (
          <li className="step" key={s.n}>
            <span className="num" aria-hidden="true">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
            <a className="btn sm" href={s.href}>{s.cta}</a>
          </li>
        ))}
      </ol>

      <div className="cols">
        <div className="panel">
          <h3>Buying</h3>
          <p>
            There is no checkout on the site. Open a listing and use Email seller or Call seller,
            then arrange payment and collection with them directly. You need to be logged in to
            save or report a listing.
          </p>
        </div>
        <div className="panel">
          <h3>Selling</h3>
          <p>
            Your listings are under My listings, where you can edit or delete them. When an item
            is gone, mark it as sold. It stays in your history but buyers can no longer contact you about it.
          </p>
        </div>
      </div>

      <div className="notice">
        <b>Staying safe.</b> Meet in a public place on campus, check the item before you pay, and
        never share your password. If a listing looks like a scam or has wrong information, open it
        and choose Report listing. An admin reviews every report, and you can follow yours
        under Dashboard, My reports.
      </div>
    </div>
  );
}
