import { useState } from 'react';
import type { Quiz } from '@/types';
import { getBibleQuizQuestions } from '../lib/seedQuestions';
import type { QuizDifficulty } from '../lib/seedQuestions';

export { getBibleQuizQuestions };
export type { QuizDifficulty } from '../lib/seedQuestions';

type GameMode = 'solo' | 'two-player';
type Player = 1 | 2;

const DIFFICULTIES: QuizDifficulty[] = ['Easy', 'Medium', 'Hard'];

export default function Quiz() {
  const [difficulty, setDifficulty] = useState<QuizDifficulty>('Easy');
  const [mode, setMode] = useState<GameMode>('solo');
  const [questions, setQuestions] = useState<Quiz[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [player, setPlayer] = useState<Player>(1);
  const [scores, setScores] = useState<Record<Player, number>>({ 1: 0, 2: 0 });
  const [answers, setAnswers] = useState<Record<Player, number | null>>({ 1: null, 2: null });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [startError, setStartError] = useState('');

  const currentQuestion = questions[questionIndex];
  const totalTurns = questions.length * (mode === 'two-player' ? 2 : 1);
  const turnNumber =
    questionIndex * (mode === 'two-player' ? 2 : 1) +
    (mode === 'two-player' && player === 2 ? 2 : 1);
  const isRevealed =
    mode === 'solo' ? answers[1] !== null : player === 2 && answers[2] !== null;

  function startQuiz() {
    const nextQuestions = getBibleQuizQuestions(10, difficulty);
    if (nextQuestions.length === 0) {
      setStartError('There are no questions available for this difficulty yet. Try another level.');
      return;
    }

    setStartError('');
    setQuestions(nextQuestions);
    setQuestionIndex(0);
    setPlayer(1);
    setScores({ 1: 0, 2: 0 });
    setAnswers({ 1: null, 2: null });
    setIsFinished(false);
    setIsPlaying(true);
  }

  function answerQuestion(optionIndex: number) {
    if (!currentQuestion || answers[player] !== null) return;

    setAnswers((current) => ({ ...current, [player]: optionIndex }));

    if (mode === 'solo' && optionIndex === currentQuestion.correct_answer) {
      setScores((current) => ({ ...current, 1: current[1] + 1 }));
    } else if (mode === 'two-player' && player === 2 && answers[1] !== null) {
      setScores((current) => ({
        1: current[1] + (answers[1] === currentQuestion.correct_answer ? 1 : 0),
        2: current[2] + (optionIndex === currentQuestion.correct_answer ? 1 : 0),
      }));
    }
  }

  function advanceTurn() {
    if (answers[player] === null) return;

    if (mode === 'two-player' && player === 1) {
      setPlayer(2);
      return;
    }

    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((current) => current + 1);
      setPlayer(1);
      setAnswers({ 1: null, 2: null });
      return;
    }

    setIsPlaying(false);
    setIsFinished(true);
  }

  function returnToSetup() {
    setIsPlaying(false);
    setIsFinished(false);
    setQuestions([]);
    setQuestionIndex(0);
    setPlayer(1);
    setScores({ 1: 0, 2: 0 });
    setAnswers({ 1: null, 2: null });
    setStartError('');
  }

  const correctAnswer = currentQuestion?.options[currentQuestion.correct_answer] ?? '';
  const winnerMessage =
    scores[1] === scores[2]
      ? "It's a tie!"
      : scores[1] > scores[2]
        ? 'Player 1 wins!'
        : 'Player 2 wins!';

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-gradient-to-b from-amber-50 via-slate-50 to-white px-4 py-8 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100 sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/10" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-primary-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-amber-200/20 blur-3xl dark:bg-amber-500/5" />
      </div>

      <div className="container-narrow mx-auto max-w-4xl">
        <header className="mb-8 text-center sm:mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary-700 shadow-sm backdrop-blur dark:bg-slate-900/70 dark:text-amber-300">
            <span aria-hidden="true">✦</span>
            Grow in wisdom
            <span aria-hidden="true">✦</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="gradient-text">Bible Quiz</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Test your Bible knowledge, learn as you play, and enjoy a friendly challenge.
          </p>
        </header>

        {!isPlaying && !isFinished && (
          <section className="glass-card mx-auto max-w-2xl space-y-7 p-5 sm:p-8">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-2xl text-white shadow-lg shadow-amber-500/25">
                ✨
              </div>
              <h2 className="text-2xl font-semibold sm:text-3xl">Ready to begin?</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Choose your challenge and how you want to play.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Choose difficulty
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Choose difficulty">
                {DIFFICULTIES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    aria-pressed={difficulty === level}
                    onClick={() => setDifficulty(level)}
                    className={
                      'rounded-xl border px-3 py-3 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 ' +
                      (difficulty === level
                        ? 'border-amber-500 bg-gradient-to-r from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/20'
                        : 'border-slate-200 bg-white/60 text-slate-700 hover:border-amber-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200')
                    }
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Choose game mode
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="group" aria-label="Choose game mode">
                <button
                  type="button"
                  aria-pressed={mode === 'solo'}
                  onClick={() => setMode('solo')}
                  className={
                    'rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 ' +
                    (mode === 'solo'
                      ? 'border-primary-500 bg-primary-50/80 shadow-md dark:bg-primary-950/30'
                      : 'border-slate-200 bg-white/50 hover:border-primary-300 dark:border-slate-700 dark:bg-slate-900/40')
                  }
                >
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-xl dark:bg-primary-900/50">
                    📖
                  </span>
                  <span className="block font-semibold">Solo challenge</span>
                  <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                    Play at your own pace.
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'two-player'}
                  onClick={() => setMode('two-player')}
                  className={
                    'rounded-2xl border p-4 text-left transition duration-200 hover:-translate-y-0.5 ' +
                    (mode === 'two-player'
                      ? 'border-amber-500 bg-amber-50/80 shadow-md dark:bg-amber-950/20'
                      : 'border-slate-200 bg-white/50 hover:border-amber-300 dark:border-slate-700 dark:bg-slate-900/40')
                  }
                >
                  <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl dark:bg-amber-900/40">
                    👥
                  </span>
                  <span className="block font-semibold">Two-player duel</span>
                  <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                    Take turns on one device and compare scores.
                  </span>
                </button>
              </div>
              {mode === 'two-player' && (
                <p className="rounded-xl border border-amber-300/50 bg-amber-50/70 p-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-200">
                  Both players answer the same questions, taking turns on this device. Scores are tracked separately.
                </p>
              )}
            </div>

            {startError && (
              <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300" role="alert">
                {startError}
              </p>
            )}

            <button type="button" onClick={startQuiz} className="btn-primary w-full py-4 text-base">
              Start quiz <span aria-hidden="true">→</span>
            </button>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Available offline with questions bundled in the app
            </p>
          </section>
        )}

        {isPlaying && currentQuestion && (
          <section className="glass-card mx-auto max-w-3xl space-y-6 p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-700 dark:text-amber-300">
                  {mode === 'two-player'
                    ? `Turn ${turnNumber} of ${totalTurns}`
                    : `Question ${questionIndex + 1} of ${questions.length}`}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your Bible knowledge journey</p>
              </div>
              <span className="rounded-full border border-amber-400/50 bg-amber-100/70 px-4 py-1.5 text-sm font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {difficulty}
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-600 to-amber-400 transition-all duration-500"
                style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`rounded-2xl border p-4 transition ${mode === 'two-player' && player === 1 ? 'border-primary-400 bg-primary-50/80 dark:bg-primary-950/30' : 'border-white/30 bg-white/50 dark:border-slate-700/50 dark:bg-slate-900/40'}`}>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {mode === 'two-player' ? 'Player 1' : 'Your score'}
                </p>
                <p className="mt-1 text-2xl font-bold">{scores[1]}</p>
              </div>
              <div className={`rounded-2xl border p-4 transition ${mode === 'two-player' && player === 2 ? 'border-amber-400 bg-amber-50/80 dark:bg-amber-950/20' : 'border-white/30 bg-white/50 dark:border-slate-700/50 dark:bg-slate-900/40'}`}>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {mode === 'two-player' ? 'Player 2' : 'Correct answers'}
                </p>
                <p className="mt-1 text-2xl font-bold">{mode === 'two-player' ? scores[2] : `${scores[1]} / ${questionIndex + (answers[1] !== null ? 1 : 0)}`}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-300/40 bg-gradient-to-br from-white/80 to-amber-50/60 p-5 dark:from-slate-900/80 dark:to-amber-950/20 sm:p-7">
              <p className="mb-3 text-sm font-semibold text-primary-700 dark:text-amber-300">
                {mode === 'two-player' ? `Player ${player}'s turn` : 'Your question'}
              </p>
              <h2 className="text-2xl font-semibold leading-snug sm:text-3xl">{currentQuestion.question}</h2>
            </div>

            <div className="grid gap-3">
              {currentQuestion.options.map((option, optionIndex) => {
                const isCorrectOption = optionIndex === currentQuestion.correct_answer;
                const isChosenByCurrentPlayer = answers[player] === optionIndex;
                const isChosenByEitherPlayer = answers[1] === optionIndex || answers[2] === optionIndex;
                let optionStyle =
                  'border-slate-200 bg-white/70 hover:border-primary-400 hover:bg-primary-50/70 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-primary-950/20';

                if (isRevealed && isCorrectOption) {
                  optionStyle = 'border-green-500 bg-green-50 text-green-950 dark:border-green-700 dark:bg-green-950/40 dark:text-green-100';
                } else if (isRevealed && isChosenByEitherPlayer) {
                  optionStyle = 'border-red-400 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100';
                } else if (answers[player] !== null) {
                  optionStyle += ' opacity-70';
                } else if (isChosenByCurrentPlayer) {
                  optionStyle = 'border-primary-500 bg-primary-50 dark:bg-primary-950/30';
                }

                return (
                  <button
                    key={optionIndex}
                    type="button"
                    disabled={answers[player] !== null}
                    aria-pressed={isChosenByCurrentPlayer}
                    onClick={() => answerQuestion(optionIndex)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition duration-200 disabled:cursor-default ${optionStyle}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <span className="font-medium">{option}</span>
                    {isRevealed && isCorrectOption && <span className="ml-auto text-lg" aria-label="Correct answer">✓</span>}
                  </button>
                );
              })}
            </div>

            <div aria-live="polite" className="space-y-2 text-sm">
              {mode === 'two-player' && player === 1 && answers[1] !== null && (
                <p className="rounded-xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  Player 1's answer is saved. Pass the device to Player 2 for the same question.
                </p>
              )}
              {isRevealed && mode === 'solo' && (
                <p className={`rounded-xl p-3 font-semibold ${answers[1] === currentQuestion.correct_answer ? 'bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200' : 'bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200'}`}>
                  {answers[1] === currentQuestion.correct_answer
                    ? 'Correct! Well done.'
                    : `Not quite. The correct answer is ${correctAnswer}.`}
                </p>
              )}
              {isRevealed && mode === 'two-player' && (
                <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                  <p>Player 1: {answers[1] === currentQuestion.correct_answer ? 'Correct' : 'Incorrect'}</p>
                  <p>Player 2: {answers[2] === currentQuestion.correct_answer ? 'Correct' : 'Incorrect'}</p>
                  <p className="mt-1 font-semibold">Correct answer: {correctAnswer}</p>
                </div>
              )}
            </div>

            <button type="button" onClick={advanceTurn} disabled={answers[player] === null} className="btn-primary w-full py-4 text-base">
              {mode === 'two-player' && player === 1
                ? 'Pass device to Player 2'
                : questionIndex + 1 === questions.length
                  ? mode === 'two-player' ? 'See final scores' : 'See score'
                  : 'Next question'}
              <span aria-hidden="true">→</span>
            </button>
          </section>
        )}

        {isFinished && (
          <section className="glass-card mx-auto max-w-2xl space-y-6 p-6 text-center sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 text-3xl text-white shadow-lg shadow-amber-500/25">
              🏆
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700 dark:text-amber-300">Challenge complete</p>
              <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Well played!</h2>
            </div>

            {mode === 'two-player' ? (
              <>
                <p className="gradient-text text-2xl font-bold sm:text-3xl">{winnerMessage}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-2xl border p-5 ${scores[1] >= scores[2] ? 'border-amber-400/70 bg-amber-50/70 dark:bg-amber-950/20' : 'border-slate-200 bg-white/50 dark:border-slate-700 dark:bg-slate-900/40'}`}>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Player 1</p>
                    <p className="mt-2 text-3xl font-bold">{scores[1]} <span className="text-base font-normal text-slate-500">/ {questions.length}</span></p>
                  </div>
                  <div className={`rounded-2xl border p-5 ${scores[2] >= scores[1] ? 'border-amber-400/70 bg-amber-50/70 dark:bg-amber-950/20' : 'border-slate-200 bg-white/50 dark:border-slate-700 dark:bg-slate-900/40'}`}>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Player 2</p>
                    <p className="mt-2 text-3xl font-bold">{scores[2]} <span className="text-base font-normal text-slate-500">/ {questions.length}</span></p>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-amber-400/50 bg-amber-50/70 p-6 dark:bg-amber-950/20">
                <p className="text-sm text-slate-600 dark:text-slate-300">Your final score</p>
                <p className="mt-2 text-4xl font-bold">{scores[1]} <span className="text-lg font-normal text-slate-500">/ {questions.length}</span></p>
              </div>
            )}

            <p className="text-sm text-slate-600 dark:text-slate-300">
              Keep learning, keep growing, and come back for another challenge.
            </p>
            <button type="button" onClick={returnToSetup} className="btn-gold w-full py-4 text-base">
              Play again <span aria-hidden="true">↻</span>
            </button>
          </section>
        )}

        <footer className="mt-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Made for learning and sharing Bible knowledge
        </footer>
      </div>
    </main>
  );
}
