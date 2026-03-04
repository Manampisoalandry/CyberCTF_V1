"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, Crown, Files, Upload, Zap, XCircle } from 'lucide-react';

function typeClass(type) {
  return `badge badge-type-${String(type || 'misc').toLowerCase()}`;
}

function difficultyClass(level) {
  return `badge badge-${String(level || 'easy').toLowerCase()}`;
}

export default function ChallengeCard({
  challenge,
  solved,
  isFirstBlood,
  responseValue,
  onTextChange,
  onQuizAnswerChange,
  onSubmit,
  submitting = false
}) {
  const challengeId = challenge?._id || challenge?.id;
  const fileCount = challenge?.files?.length || 0;
  const nextBloodBonus = Number.isFinite(challenge?.nextBloodBonus)
    ? challenge.nextBloodBonus
    : ((challenge?.solvesCount || 0) === 0 ? 80 : (challenge?.solvesCount || 0) === 1 ? 50 : 0);
  const quizQuestions = Array.isArray(challenge?.quizQuestions) ? challenge.quizQuestions : [];
  const isQuizMode = challenge?.submissionMode === 'quiz' && quizQuestions.length > 0;
  const textValue = typeof responseValue === 'string' ? responseValue : '';
  const quizAnswers = Array.isArray(responseValue)
    ? responseValue
    : Array.from({ length: quizQuestions.length }, () => '');

  return (
    <motion.div className="glass challenge-card challenge-card-wow"
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -6, rotateX: 1.4, rotateY: -1.4 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="challenge-sheen" />
      <div className="challenge-orb challenge-orb-a" />
      <div className="challenge-orb challenge-orb-b" />

      <div className="challenge-card-head">
        <div className="challenge-card-main stack">
          <div className="row-wrap challenge-card-title-row">
            <h3 className="title-md challenge-card-title">{challenge.title}</h3>
          </div>

          <div className="row-wrap challenge-card-badges">
            <span className={typeClass(challenge.type)}>{challenge.type}</span>
            <span className={difficultyClass(challenge.difficulty)}>{challenge.difficulty}</span>
            {isFirstBlood && (
              <span className="badge badge-gold">
                <Crown size={12} />
                First Blood
              </span>
            )}
            {solved && (
              <span className="badge badge-success-soft">
                <CheckCircle2 size={12} />
                Résolu
              </span>
            )}
            {isQuizMode && (
              <span className="badge badge-outline-neutral">Quiz OSINT</span>
            )}
            {!solved && nextBloodBonus > 0 && (
              <span className="badge badge-bonus">
                <Zap size={12} />
                +{nextBloodBonus} speed bonus
              </span>
            )}
          </div>

          <div className="challenge-description text-muted clamp-2">{challenge.description}</div>

          <div className="row-wrap challenge-card-meta">
            <span className="file-chip file-chip-hot">{challenge.points} pts</span>
            <span className="file-chip">{challenge.solvesCount ?? 0} solve(s)</span>
            <span className="file-chip">
              <Files size={13} />
              {fileCount} fichier(s)
            </span>
            <span className="file-chip file-chip-soft">1er +80 / 2e +50</span>
          </div>
        </div>

        <div className="challenge-card-side">
          <Link className="btn btn-outline-accent row challenge-open-btn" href={`/challenges/${challengeId}`}>
            Ouvrir
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      <div className="challenge-cta-bar challenge-cta-bar-stacked">
        {solved ? (
          <div className="notice notice-success challenge-card-notice">
            <CheckCircle2 size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            Challenge validé — tu peux revoir le détail et retélécharger les fichiers.
          </div>
        ) : (
          <div className="notice notice-subtle notice-premium challenge-card-notice">
            <XCircle size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            {isQuizMode
              ? 'Ce challenge OSINT utilise un quiz multi-questions. Réponds à tout pour le valider.'
              : 'Soumets vite pour viser le bonus vitesse, ou ouvre la page dédiée pour voir tous les détails.'}
          </div>
        )}

        {isQuizMode ? (
          <div className="stack" style={{ gap: 12 }}>
            <div className="quiz-inline-card">
              <div className="quiz-inline-title">Quiz OSINT</div>
              <div className="stack" style={{ gap: 12 }}>
                {quizQuestions.map((question, questionIndex) => (
                  <div key={question.id || `question-${questionIndex}`} className="stack" style={{ gap: 8 }}>
                    <div className="quiz-inline-title">{questionIndex + 1}. {question.question}</div>
                    <div className="quiz-option-list">
                      {question.options.map((option) => (
                        <label key={`${questionIndex}-${option}`} className={`quiz-option ${quizAnswers[questionIndex] === option ? 'is-selected' : ''}`}>
                          <input
                            type="radio"
                            name={`challenge-quiz-${challengeId}-${questionIndex}`}
                            checked={quizAnswers[questionIndex] === option}
                            disabled={solved || submitting}
                            onChange={() => onQuizAnswerChange?.(questionIndex, option)}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              className="btn btn-accent challenge-submit-btn"
              onClick={onSubmit}
              disabled={solved || submitting}
              title="Soumettre"
            >
              {solved ? <CheckCircle2 size={16} /> : <Upload size={16} />}
              <span>{solved ? 'Validé' : submitting ? 'Envoi...' : 'Valider le quiz'}</span>
            </button>
          </div>
        ) : (
          <div className="challenge-submit-row">
            <input
              className="input challenge-submit-input"
              placeholder="Entrer la flag"
              value={textValue}
              disabled={solved || submitting}
              onChange={(event) => onTextChange?.(event.target.value)}
            />
            <button
              className="btn btn-accent challenge-submit-btn"
              onClick={onSubmit}
              disabled={solved || submitting}
              title="Soumettre"
            >
              {solved ? <CheckCircle2 size={16} /> : <Upload size={16} />}
              <span>{solved ? 'Validée' : submitting ? 'Envoi...' : 'Soumettre'}</span>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
