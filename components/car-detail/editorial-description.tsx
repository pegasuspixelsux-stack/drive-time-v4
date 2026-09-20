import type { CarDetail } from "@/data/car-details";

export function EditorialDescription({
  editorial,
}: {
  editorial: CarDetail["editorial"];
}) {
  const [firstParagraph, ...restParagraphs] = editorial.paragraphs;
  const dropCap = firstParagraph.charAt(0);
  const restOfFirstParagraph = firstParagraph.slice(1);

  return (
    <div className="mx-auto max-w-[1000px] px-6 py-14 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
          {editorial.headline}
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-muted">
          {editorial.dek}
        </p>

        <div className="mt-8 flex flex-col gap-6 text-[1.05rem] leading-[1.9] text-foreground">
          <p>
            <span className="float-left mr-2 font-serif text-6xl font-semibold leading-[0.8] text-foreground">
              {dropCap}
            </span>
            {restOfFirstParagraph}
          </p>
          {restParagraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
