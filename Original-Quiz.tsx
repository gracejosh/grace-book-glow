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
  const turnNumber = questionIndex * (mode === 'two-player' ? 2 : 1) +
    (mode === 'two-player' && player === 2 ? 2 : 1);
  const isRevealed = mode === 'solo'
    ? answers[1] !== null
    : player === 2 && answers[2] !== null;

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
  const winnerMessage = scores[1] === scores[2]
    ? 'It is a tie!'
    : scores[1] > scores[2]
      ? 'Player 1 wins!'
      : 'Player 2 wins!';

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Bible Quiz</h1>
        <p className="text-muted-foreground">Choose a level and play offline with questions bundled in the app.</p>
      </header>

      {!isPlaying && !isFinished && (
        <section className="space-y-6 rounded-xl border bg-card p-5 text-card-foreground shadow-sm sm:p-7">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Difficulty</h2>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Choose difficulty">
              {DIFFICULTIES.map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={difficulty === level}
                  onClick={() => setDifficulty(level)}
                  className={'rounded-lg border px-3 py-3 font-medium transition ' +
                    (difficulty === level ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Players</h2>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Choose game mode">
              <button
                type="button"
                aria-pressed={mode === 'solo'}
                onClick={() => setMode('solo')}
                className={'rounded-lg border px-3 py-3 font-medium transition ' +
                  (mode === 'solo' ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}
              >
                Solo
              </button>
              <button
                type="button"
                aria-pressed={mode === 'two-player'}
                onClick={() => setMode('two-player')}
                className={'rounded-lg border px-3 py-3 font-medium transition ' +
                  (mode === 'two-player' ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}
              >
                2 players
              </button>
            </div>
            {mode === 'two-player' && (
              <p className="text-sm text-muted-foreground">
                Both players answer the same questions, alternating on this device. Scores stay separate.
              </p>
            )}
          </div>

          {startError && <p className="text-sm text-destructive" role="alert">{startError}</p>}
          <button
            type="button"
            onClick={startQuiz}
            className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90"
          >
            Start quiz
          </button>
        </section>
      )}

      {isPlaying && currentQuestion && (
        <section className="space-y-5 rounded-xl border bg-card p-5 text-card-foreground shadow-sm sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>{mode === 'two-player' ? 'Turn ' + turnNumber + ' of ' + totalTurns : 'Question ' + (questionIndex + 1) + ' of ' + questions.length}</span>
            <span className="rounded-full border px-3 py-1">{difficulty}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Player 1</p>
              <p className="text-xl font-bold">{scores[1]}</p>
            </div>
            {mode === 'two-player' ? (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">Player 2</p>
                <p className="text-xl font-bold">{scores[2]}</p>
              </div>
            ) : (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">Your score</p>
                <p className="text-xl font-bold">{scores[1]}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">
              {mode === 'two-player' ? 'Player ' + player + '’s turn' : 'Your turn'}
            </p>
            <h2 className="text-xl font-semibold leading-snug">{currentQuestion.question}</h2>
          </div>

          <div className="grid gap-3">
            {currentQuestion.options.map((option, optionIndex) => {
              const isCorrectOption = optionIndex === currentQuestion.correct_answer;
              const isChosenByCurrentPlayer = answers[player] === optionIndex;
              const isChosenByEitherPlayer = answers[1] === optionIndex || answers[2] === optionIndex;
              let optionStyle = 'hover:border-primary hover:bg-muted';

              if (isRevealed && isCorrectOption) {
                optionStyle = 'border-green-600 bg-green-50 text-green-900';
              } else if (isRevealed && isChosenByEitherPlayer) {
                optionStyle = 'border-red-600 bg-red-50 text-red-900';
              } else if (answers[player] !== null) {
                optionStyle = 'opacity-70';
              }

              return (
                <button
                  key={optionIndex}
                  type="button"
                  disabled={answers[player] !== null}
                  aria-pressed={isChosenByCurrentPlayer}
                  onClick={() => answerQuestion(optionIndex)}
                  className={'w-full rounded-lg border p-4 text-left transition disabled:cursor-default ' + optionStyle}
                >
                  <span className="mr-3 font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>
                  {option}
                </button>
              );
            })}
          </div>

          <div aria-live="polite" className="space-y-2 text-sm">
            {mode === 'two-player' && player === 1 && answers[1] !== null && (
              <p>Player 1’s answer is saved. Pass the device to Player 2 for the same question.</p>
            )}
            {isRevealed && mode === 'solo' && (
              <p>{answers[1] === currentQuestion.correct_answer ? 'Correct!' : 'Not quite. The correct answer is ' + correctAnswer + '.'}</p>
            )}
            {isRevealed && mode === 'two-player' && (
              <>
                <p>Player 1: {answers[1] === currentQuestion.correct_answer ? 'Correct' : 'Incorrect'}</p>
                <p>Player 2: {answers[2] === currentQuestion.correct_answer ? 'Correct' : 'Incorrect'}</p>
                <p>Correct answer: {correctAnswer}</p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={advanceTurn}
            disabled={answers[player] === null}
            className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {mode === 'two-player' && player === 1
              ? 'Pass device to Player 2'
              : questionIndex + 1 === questions.length
                ? mode === 'two-player' ? 'See final scores' : 'See score'
                : 'Next question'}
          </button>
        </section>
      )}

      {isFinished && (
        <section className="space-y-5 rounded-xl border bg-card p-5 text-center text-card-foreground shadow-sm sm:p-7">
          <h2 className="text-2xl font-bold">Quiz complete</h2>
          {mode === 'two-player' ? (
            <>
              <p className="text-lg font-semibold">{winnerMessage}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Player 1</p>
                  <p className="text-2xl font-bold">{scores[1]} / {questions.length}</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Player 2</p>
                  <p className="text-2xl font-bold">{scores[2]} / {questions.length}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-lg">Your score: {scores[1]} / {questions.length}</p>
          )}
          <button
            type="button"
            onClick={returnToSetup}
            className="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:opacity-90"
          >
            Play again
          </button>
        </section>
      )}
    </main>
  );
}