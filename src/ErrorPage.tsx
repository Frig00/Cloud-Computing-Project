import { useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  console.error(error);

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center">
      <span className="font-bold text-4xl">Oops!</span>
      <p>Sorry, an unexpected error has occurred.</p>
      <p>
        {/* @ts-ignore */}
      <i>{error.statusText || error.message}</i> // @ts-ignore
      </p>
    </div>
  );
}