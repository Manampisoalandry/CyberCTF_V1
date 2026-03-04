"use client";

import { useEffect, useMemo, useState } from 'react';
import { MinusCircle, PlusCircle } from 'lucide-react';

const createEmptyQuizQuestion = () => ({
  question: '',
  options: ['', ''],
  correctAnswer: ''
});

const createEmptyHint = () => ({
  title: '',
  content: '',
  cost: 0
});

const initialForm = {
  title: '',
  type: 'Web',
  description: '',
  difficulty: 'Easy',
  flag: '',
  points: 100,
  enableQuiz: false,
  quizQuestions: [createEmptyQuizQuestion()],
  isSuspendedUntilPrerequisite: false,
  prerequisiteChallengeId: '',
  hints: [createEmptyHint()]
};

function formatBytes(bytes = 0) {
  if (!bytes) return '0 o';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1);
  return `${rounded} ${units[unitIndex]}`;
}

export default function AdminChallengeForm({
  editingChallenge,
  availableChallenges = [],
  onSubmit,
  onCancel,
  loading,
  uploadProgress = 0,
  className = '',
  showNotice = true
}) {
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [uiMode, setUiMode] = useState('wizard');
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    if (editingChallenge) {
      const existingQuestions = Array.isArray(editingChallenge.quizQuestions) && editingChallenge.quizQuestions.length
        ? editingChallenge.quizQuestions.map((item) => ({
            question: item.question || '',
            options: Array.isArray(item.options) && item.options.length ? item.options.slice(0, 6) : ['', ''],
            correctAnswer: item.correctAnswer || ''
          }))
        : [createEmptyQuizQuestion()];

      const existingHints = Array.isArray(editingChallenge.hints) && editingChallenge.hints.length
        ? editingChallenge.hints.map((h) => ({
            title: h.title || '',
            content: h.content || '',
            cost: Number(h.cost || 0)
          }))
        : [createEmptyHint()];

      setForm({
        title: editingChallenge.title || '',
        type: editingChallenge.type || 'Web',
        description: editingChallenge.description || '',
        difficulty: editingChallenge.difficulty || 'Easy',
        flag: editingChallenge.flag || '',
        points: editingChallenge.points || 100,
        enableQuiz: Array.isArray(editingChallenge.quizQuestions) && editingChallenge.quizQuestions.length > 0,
        quizQuestions: existingQuestions,
        isSuspendedUntilPrerequisite: Boolean(editingChallenge.isSuspendedUntilPrerequisite),
        prerequisiteChallengeId: editingChallenge.prerequisiteChallenge?.id || editingChallenge.prerequisiteChallenge?._id || '',
        hints: existingHints
      });

      setFiles([]);
      return;
    }

    setForm(initialForm);
    setFiles([]);
  }, [editingChallenge]);

  const label = useMemo(
    () => (editingChallenge ? 'Modifier le challenge' : 'Créer un challenge'),
    [editingChallenge]
  );

  const selectableChallenges = useMemo(() => {
    const editingId = editingChallenge?._id || editingChallenge?.id;
    return (availableChallenges || []).filter((item) => {
      const itemId = item?._id || item?.id;
      return itemId && itemId !== editingId;
    });
  }, [availableChallenges, editingChallenge]);

  const fileCount = files.length;
  const totalBytes = useMemo(
    () => files.reduce((sum, file) => sum + (file?.size || 0), 0),
    [files]
  );
  const clampedProgress = Math.max(0, Math.min(100, Number(uploadProgress || 0)));

  const isOsint = form.type === 'OSINT';
  const isQuizMode = isOsint && form.enableQuiz;

  const sanitizedQuizQuestions = useMemo(() => {
    if (!isQuizMode) return [];

    return form.quizQuestions
      .map((item) => {
        const question = String(item.question || '').trim();
        const options = Array.isArray(item.options)
          ? item.options.map((option) => String(option || '').trim()).filter(Boolean)
          : [];
        const correctAnswer = String(item.correctAnswer || '').trim();

        if (!question || options.length < 2 || !correctAnswer || !options.includes(correctAnswer)) {
          return null;
        }

        return { question, options, correctAnswer };
      })
      .filter(Boolean)
      .slice(0, 10);
  }, [form.quizQuestions, isQuizMode]);

  const sanitizedHints = useMemo(() => {
    return (form.hints || [])
      .map((h) => ({
        title: String(h.title || '').trim(),
        content: String(h.content || '').trim(),
        cost: Number.isFinite(Number(h.cost)) ? Math.max(0, Number(h.cost)) : 0
      }))
      .filter((h) => h.content)
      .slice(0, 20);
  }, [form.hints]);

  const updateQuestion = (questionIndex, updates) => {
    setForm((prev) => {
      const nextQuestions = prev.quizQuestions.map((item, index) => {
        if (index !== questionIndex) return item;
        const nextItem = { ...item, ...updates };
        const optionSet = Array.isArray(nextItem.options)
          ? nextItem.options.map((option) => String(option || '').trim()).filter(Boolean)
          : [];
        if (nextItem.correctAnswer && !optionSet.includes(nextItem.correctAnswer)) {
          nextItem.correctAnswer = '';
        }
        return nextItem;
      });

      return {
        ...prev,
        quizQuestions: nextQuestions
      };
    });
  };

  const addQuestion = () => {
    setForm((prev) => ({
      ...prev,
      quizQuestions: [...prev.quizQuestions, createEmptyQuizQuestion()].slice(0, 10)
    }));
  };

  const removeQuestion = (questionIndex) => {
    setForm((prev) => {
      if (prev.quizQuestions.length <= 1) {
        return {
          ...prev,
          quizQuestions: [createEmptyQuizQuestion()]
        };
      }

      return {
        ...prev,
        quizQuestions: prev.quizQuestions.filter((_, index) => index !== questionIndex)
      };
    });
  };

  const addOption = (questionIndex) => {
    setForm((prev) => ({
      ...prev,
      quizQuestions: prev.quizQuestions.map((item, index) => {
        if (index !== questionIndex) return item;
        if ((item.options || []).length >= 6) return item;
        return {
          ...item,
          options: [...(item.options || []), '']
        };
      })
    }));
  };

  const removeOption = (questionIndex, optionIndex) => {
    setForm((prev) => ({
      ...prev,
      quizQuestions: prev.quizQuestions.map((item, index) => {
        if (index !== questionIndex) return item;
        const nextOptions = Array.isArray(item.options)
          ? item.options.filter((_, idx) => idx !== optionIndex)
          : [];
        return {
          ...item,
          options: nextOptions.length >= 2 ? nextOptions : ['', ''],
          correctAnswer: nextOptions.includes(item.correctAnswer) ? item.correctAnswer : ''
        };
      })
    }));
  };

  const handleOptionChange = (questionIndex, optionIndex, value) => {
    setForm((prev) => ({
      ...prev,
      quizQuestions: prev.quizQuestions.map((item, index) => {
        if (index !== questionIndex) return item;
        const nextOptions = [...(item.options || [])];
        nextOptions[optionIndex] = value;
        const trimmedValue = String(value || '').trim();
        const nextCorrectAnswer = item.correctAnswer === (item.options?.[optionIndex] || '') && !trimmedValue
          ? ''
          : item.correctAnswer;
        return {
          ...item,
          options: nextOptions,
          correctAnswer: nextCorrectAnswer
        };
      })
    }));
  };

  const updateHint = (hintIndex, updates) => {
    setForm((prev) => ({
      ...prev,
      hints: (prev.hints || []).map((h, idx) => (idx === hintIndex ? { ...h, ...updates } : h))
    }));
  };

  const addHint = () => {
    setForm((prev) => ({
      ...prev,
      hints: [...(prev.hints || []), createEmptyHint()].slice(0, 20)
    }));
  };

  const removeHint = (hintIndex) => {
    setForm((prev) => {
      const next = (prev.hints || []).filter((_, idx) => idx !== hintIndex);
      return {
        ...prev,
        hints: next.length ? next : [createEmptyHint()]
      };
    });
  };

  const handleTypeChange = (value) => {
    setForm((prev) => ({
      ...prev,
      type: value,
      enableQuiz: value === 'OSINT' ? prev.enableQuiz : false
    }));
  };

  const handleSubmit = () => {
    const payload = new FormData();
    payload.append('title', form.title);
    payload.append('type', form.type);
    payload.append('description', form.description);
    payload.append('difficulty', form.difficulty);
    payload.append('flag', isQuizMode ? '' : form.flag);
    payload.append('points', String(form.points));
    payload.append('quizQuestions', JSON.stringify(isQuizMode ? sanitizedQuizQuestions : []));
    payload.append('hints', JSON.stringify(sanitizedHints));
    payload.append('isSuspendedUntilPrerequisite', String(form.isSuspendedUntilPrerequisite));
    payload.append('prerequisiteChallengeId', form.isSuspendedUntilPrerequisite ? form.prerequisiteChallengeId : '');

    for (const file of files) {
      payload.append('files', file);
    }

    onSubmit?.(payload);
  };

  const submitLabel = loading
    ? fileCount
      ? `Upload ${clampedProgress}%`
      : 'Enregistrement...'
    : editingChallenge
      ? 'Enregistrer'
      : 'Créer';

  const introText = editingChallenge
    ? 'Ajuste rapidement les paramètres du challenge. Fais défiler pour gérer les hints, le quiz ou les fichiers sans casser la mise en page.'
    : 'Configure un challenge complet avec une interface plus fluide, des sections mieux séparées et un scroll intégré pour les longs formulaires.';

  const steps = [
    { key: 'base', title: 'Infos' },
    { key: 'access', title: 'Scores & accès' },
    { key: 'hints', title: 'Hints / Quiz' },
    { key: 'files', title: 'Fichiers' }
  ];

  const canGoBack = step > 0;
  const canGoNext = step < steps.length - 1;

  const Section = ({ title, description, children, defaultOpen = true }) => {
    if (uiMode === 'wizard') {
      return (
        <div className="admin-section">
          <div className="admin-section-head">
            <div className="admin-section-title">{title}</div>
            {description ? <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{description}</div> : null}
          </div>
          <div className="admin-section-body">{children}</div>
        </div>
      );
    }

    return (
      <details className="admin-accordion" open={defaultOpen}>
        <summary className="admin-accordion-summary">
          <span>{title}</span>
          <span className="admin-accordion-chevron" aria-hidden>▾</span>
        </summary>
        {description ? <div className="text-muted" style={{ fontSize: 12, padding: '0 14px 10px' }}>{description}</div> : null}
        <div className="admin-accordion-body">{children}</div>
      </details>
    );
  };

  return (
    <div className={`glass card admin-form-card ${className}`.trim()}>
      <div className="admin-form-header">
        <div className="admin-form-header-copy">
          <div className="eyebrow">Mission control</div>
          <h2 className="panel-title title-md">{label}</h2>
          <p className="text-muted admin-form-subtitle">{introText}</p>
        </div>

        <div className="row" style={{ gap: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
          <span className="badge badge-outline-neutral">UI</span>
          <div className="segmented">
            <button
              type="button"
              className={`segmented-btn ${uiMode === 'wizard' ? 'segmented-btn-active' : ''}`}
              onClick={() => setUiMode('wizard')}
            >
              Wizard
            </button>
            <button
              type="button"
              className={`segmented-btn ${uiMode === 'accordion' ? 'segmented-btn-active' : ''}`}
              onClick={() => setUiMode('accordion')}
            >
              Compact
            </button>
          </div>
        </div>
      </div>

      {uiMode === 'wizard' && (
        <div className="admin-stepper">
          {steps.map((s, idx) => (
            <button
              key={s.key}
              type="button"
              className={`admin-step ${idx === step ? 'admin-step-active' : idx < step ? 'admin-step-done' : ''}`}
              onClick={() => setStep(idx)}
            >
              <span className="admin-step-index">{idx + 1}</span>
              <span className="admin-step-title">{s.title}</span>
            </button>
          ))}
        </div>
      )}

      {showNotice && (
        <div className="notice admin-form-notice">
          <div className="notice-title">Tips</div>
          <div className="notice-body">
            <ul>
              <li>Les hints payants retirent des points au participant.</li>
              <li>En type OSINT, tu peux activer le mode quiz (multi-questions).</li>
            </ul>
          </div>
        </div>
      )}

      <div className="form-grid" style={{ marginTop: 14 }}>
        {(uiMode !== 'wizard' || step === 0) && (
          <Section title="Informations" description="Titre, catégorie, difficulté et description affichée aux participants.">
            <div className="stack" style={{ gap: 12 }}>
              <div>
                <label className="input-label">Titre</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Ghost Pulse"
                />
              </div>

              <div className="grid-2" style={{ gap: 12 }}>
                <div>
                  <label className="input-label">Type</label>
                  <select className="input" value={form.type} onChange={(e) => handleTypeChange(e.target.value)}>
                    {['Web', 'Crypto', 'Forensics', 'Reverse', 'OSINT', 'Stegano', 'Misc'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">Difficulté</label>
                  <select
                    className="input"
                    value={form.difficulty}
                    onChange={(e) => setForm((prev) => ({ ...prev, difficulty: e.target.value }))}
                  >
                    {['Easy', 'Medium', 'Hard', 'Insane'].map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Description</label>
                <textarea
                  className="input"
                  rows={6}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief du challenge..."
                />
              </div>
            </div>
          </Section>
        )}

        {(uiMode !== 'wizard' || step === 1) && (
          <Section title="Scores & accès" description="Points, flag (ou quiz OSINT) et verrouillage par prérequis.">
            <div className="stack" style={{ gap: 12 }}>
              <div className="grid-2" style={{ gap: 12 }}>
                <div>
                  <label className="input-label">Points</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={form.points}
                    onChange={(e) => setForm((prev) => ({ ...prev, points: Number(e.target.value || 0) }))}
                  />
                </div>

                <div>
                  <label className="input-label">Flag</label>
                  <input
                    className="input"
                    value={form.flag}
                    onChange={(e) => setForm((prev) => ({ ...prev, flag: e.target.value }))}
                    disabled={isQuizMode}
                    placeholder={isQuizMode ? 'Quiz actif' : 'CCOI{...}'}
                  />
                </div>
              </div>

              <div className="glass card" style={{ padding: 14 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="input-label" style={{ margin: 0 }}>Suspension (prérequis)</div>
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                      Cache ce challenge tant que le challenge prérequis n’est pas résolu.
                    </div>
                  </div>

                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={form.isSuspendedUntilPrerequisite}
                      onChange={(e) => setForm((prev) => ({ ...prev, isSuspendedUntilPrerequisite: e.target.checked }))}
                    />
                    <span className="switch-slider" />
                  </label>
                </div>

                {form.isSuspendedUntilPrerequisite && (
                  <div style={{ marginTop: 12 }}>
                    <label className="input-label">Challenge prérequis</label>
                    <select
                      className="input"
                      value={form.prerequisiteChallengeId}
                      onChange={(e) => setForm((prev) => ({ ...prev, prerequisiteChallengeId: e.target.value }))}
                    >
                      <option value="">-- Choisir --</option>
                      {selectableChallenges.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {isOsint && (
                <div className="glass card" style={{ padding: 14 }}>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div className="input-label" style={{ margin: 0 }}>Mode Quiz (OSINT)</div>
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                        Active un quiz multi-questions (radio) au lieu d’une flag.
                      </div>
                    </div>

                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={form.enableQuiz}
                        onChange={(e) => setForm((prev) => ({ ...prev, enableQuiz: e.target.checked }))}
                      />
                      <span className="switch-slider" />
                    </label>
                  </div>

                  {isQuizMode && (
                    <div className="stack" style={{ marginTop: 14 }}>
                      {form.quizQuestions.map((q, index) => (
                        <div key={index} className="glass card" style={{ padding: 14 }}>
                          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="badge badge-outline-pink">Question {index + 1}</span>
                            <button className="btn btn-outline" type="button" onClick={() => removeQuestion(index)}>
                              <MinusCircle size={16} />
                              Supprimer
                            </button>
                          </div>

                          <label className="input-label" style={{ marginTop: 12 }}>Question</label>
                          <input
                            className="input"
                            value={q.question}
                            onChange={(e) => updateQuestion(index, { question: e.target.value })}
                          />

                          <div className="grid-2" style={{ gap: 12, marginTop: 12 }}>
                            <div>
                              <label className="input-label">Réponse correcte</label>
                              <input
                                className="input"
                                value={q.correctAnswer}
                                onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })}
                                placeholder="Doit correspondre à une option"
                              />
                            </div>
                            <div className="row" style={{ justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                              <button className="btn btn-outline-accent" type="button" onClick={() => addOption(index)}>
                                <PlusCircle size={16} />
                                Option
                              </button>
                            </div>
                          </div>

                          <div className="stack admin-inline-scroll" style={{ marginTop: 12 }}>
                            {(q.options || []).map((opt, optIndex) => (
                              <div key={optIndex} className="row" style={{ gap: 10, alignItems: 'center' }}>
                                <input
                                  className="input"
                                  style={{ flex: 1 }}
                                  value={opt}
                                  onChange={(e) => handleOptionChange(index, optIndex, e.target.value)}
                                  placeholder={`Option ${optIndex + 1}`}
                                />
                                <button className="icon-btn" type="button" onClick={() => removeOption(index, optIndex)}>
                                  <MinusCircle size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <button className="btn btn-outline-accent" type="button" onClick={addQuestion}>
                        <PlusCircle size={16} />
                        Ajouter une question
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>
        )}

        {(uiMode !== 'wizard' || step === 2) && (
          <Section title="Hints" description="Indices gratuits ou payants, affichés avec un cadenas côté participant.">
            <div>
              <div className="text-muted" style={{ marginTop: 0 }}>
                Ajoute des indices. Les hints peuvent être gratuits ou payants (ex: 20 pts).
              </div>

              <div className="stack admin-inline-scroll" style={{ marginTop: 12 }}>
                {(form.hints || []).map((hint, idx) => (
                  <div key={idx} className="glass card" style={{ padding: 14 }}>
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                        <span className="badge badge-outline-pink">Hint {idx + 1}</span>
                        <span className="badge badge-outline-neutral">{Number(hint.cost || 0) === 0 ? 'Free' : `${hint.cost} pts`}</span>
                      </div>
                      <button className="btn btn-outline" type="button" onClick={() => removeHint(idx)}>
                        <MinusCircle size={16} />
                        Supprimer
                      </button>
                    </div>

                    <div className="grid-2" style={{ gap: 12, marginTop: 12 }}>
                      <div>
                        <label className="input-label">Titre</label>
                        <input
                          className="input"
                          value={hint.title}
                          onChange={(e) => updateHint(idx, { title: e.target.value })}
                          placeholder="Ex: Cherche dans les TTL"
                        />
                      </div>
                      <div>
                        <label className="input-label">Coût (pts)</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          value={hint.cost}
                          onChange={(e) => updateHint(idx, { cost: Number(e.target.value || 0) })}
                        />
                      </div>
                    </div>

                    <label className="input-label" style={{ marginTop: 12 }}>Contenu</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={hint.content}
                      onChange={(e) => updateHint(idx, { content: e.target.value })}
                      placeholder="Indice..."
                    />
                  </div>
                ))}
              </div>

              <button className="btn btn-outline-accent" type="button" onClick={addHint} style={{ marginTop: 12 }}>
                <PlusCircle size={16} />
                Ajouter un hint
              </button>
            </div>
          </Section>
        )}

        {(uiMode !== 'wizard' || step === 3) && (
          <Section title="Fichiers" description="Pièces jointes du challenge (PDF, ZIP, images…).">
            <div>
              <div className="text-muted" style={{ marginTop: 0 }}>
                {fileCount} fichier(s) • {formatBytes(totalBytes)}
              </div>

              <div className="upload-drop" style={{ marginTop: 12 }}>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
                <div className="upload-drop-body">
                  <div className="upload-drop-title">Glisse-dépose ou clique pour sélectionner</div>
                  <div className="upload-drop-sub">ZIP, PDF, images, etc.</div>
                </div>
              </div>
            </div>
          </Section>
        )}

        <div className="row admin-form-actions" style={{ gap: 12, justifyContent: 'space-between' }}>
          <div className="row" style={{ gap: 10 }}>
            {uiMode === 'wizard' && (
              <>
                <button
                  className="btn btn-outline"
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={loading || !canGoBack}
                >
                  Précédent
                </button>
                <button
                  className="btn btn-outline-accent"
                  type="button"
                  onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                  disabled={loading || !canGoNext}
                >
                  Suivant
                </button>
              </>
            )}
          </div>

          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-outline" type="button" onClick={onCancel} disabled={loading}>
              Annuler
            </button>
            <button className="btn btn-accent" type="button" onClick={handleSubmit} disabled={loading}>
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
