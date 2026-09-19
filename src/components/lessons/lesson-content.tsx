import type { GeneratedLessonContent } from "@/lib/ai/schemas/lesson";

type LessonContentProps = {
  lesson: GeneratedLessonContent;
};

export function LessonContent({ lesson }: LessonContentProps) {
  return (
    <article className="min-w-0">
      <p className="mb-12 text-lg leading-8 text-neutral-600 dark:text-neutral-300">
        {lesson.introduction}
      </p>

      <div className="space-y-12">
        {lesson.sections.map((section, index) => {
          if (section.type === "text") {
            return (
              <section
                id={`lesson-section-${index}`}
                key={index}
                className=" scroll-mt-8"
              >
                {section.title && (
                  <h2 className="mb-4 text-2xl font-semibold tracking-tight text-neutral-950 dark:text-white">
                    {section.title}
                  </h2>
                )}
                <p className="whitespace-pre-line leading-8 text-neutral-700 dark:text-neutral-200">
                  {section.content}
                </p>
              </section>
            );
          }

          if (section.type === "example") {
            return (
              <section
                key={index}
                id={`lesson-section-${index}`}
                className=" scroll-mt-8 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-7 dark:border-neutral-800 dark:bg-neutral-900"
              >
                {section.title && (
                  <h3 className="mb-4 font-semibold">{section.title}</h3>
                )}
                <div className="mb-4 whitespace-pre-line font-medium leading-7">
                  {section.example}
                </div>
                <p className="whitespace-pre-line leading-7 text-neutral-600 dark:text-neutral-300">
                  {section.explanation}
                </p>
              </section>
            );
          }

          if (section.type === "note") {
            return (
              <aside
                id={`lesson-section-${index}`}
                key={index}
                className=" scroll-mt-8 border-l-4 border-neutral-900 pl-5 dark:border-neutral-200"
              >
                {section.title && (
                  <h3 className="mb-2 font-semibold">{section.title}</h3>
                )}
                <p className="whitespace-pre-line leading-7 text-neutral-600 dark:text-neutral-300">
                  {section.content}
                </p>
              </aside>
            );
          }

          if (section.type === "list") {
            return (
              <section
                id={`lesson-section-${index}`}
                key={index}
                className=" scroll-mt-8"
              >
                {section.title && (
                  <h3 className="mb-4 text-xl font-semibold dark:text-white">
                    {section.title}
                  </h3>
                )}
                <ul className="space-y-3">
                  {section.items.map((item, itemIndex) => (
                    <li
                      key={itemIndex}
                      className="flex gap-3 leading-7 text-neutral-700 dark:text-neutral-200"
                    >
                      <span aria-hidden="true">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          }

          return null;
        })}
      </div>

      <section className="mt-14  rounded-2xl bg-neutral-950 p-7 text-white sm:p-8 dark:bg-neutral-900 dark:ring-1 dark:ring-neutral-800">
        <h2 className="mb-5 text-xl font-semibold">Key takeaways</h2>
        <ul className="space-y-3">
          {lesson.keyTakeaways.map((takeaway, index) => (
            <li
              key={index}
              className="flex gap-3 leading-7 text-neutral-200 dark:text-neutral-300"
            >
              <span aria-hidden="true">•</span>
              <span>{takeaway}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 ">
        <h2 className="mb-4 text-2xl font-semibold dark:text-white">Summary</h2>
        <p className="whitespace-pre-line leading-8 text-neutral-700 dark:text-neutral-200">
          {lesson.summary}
        </p>
      </section>
    </article>
  );
}
