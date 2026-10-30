import { articleExercises } from '@/lib/tutorial-exercises';

export function ArticleExercise({ slug }: { slug: string }) {
  if (!Object.hasOwn(articleExercises, slug)) return null;
  const exercise = articleExercises[slug];
  const downloads = [
    ...new Map([...exercise.inputs, ...exercise.results].map((file) => [file.href, file])).values(),
  ];
  return (
    <section id="practice-exercise" aria-labelledby="practice-exercise-title">
      <h2 id="practice-exercise-title">{exercise.title}</h2>
      <p>{exercise.purpose}</p>
      {!!downloads.length && (
        <ul>
          {downloads.map((file) => (
            <li key={file.href}>
              <a href={file.href} download>
                {file.label}
              </a>
            </li>
          ))}
        </ul>
      )}
      <ol>
        {exercise.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <h3>Expected result</h3>
      <p>{exercise.expected}</p>
      <h3>If your result differs</h3>
      <p>{exercise.ifDifferent}</p>
      <p>{exercise.processing}</p>
    </section>
  );
}
