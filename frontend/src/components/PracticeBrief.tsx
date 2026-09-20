import { useState, useEffect, useRef } from 'react'
import type { PracticeQuestion } from '../types/practice'

interface PracticeBriefProps {
  question: PracticeQuestion
  onSubmit: () => void
  isSubmitting?: boolean
  onStateChange?: (state: 'idle' | 'running' | 'finished') => void
}

function PracticeBrief({ question, onSubmit, isSubmitting, onStateChange }: PracticeBriefProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [testState, setTestState] = useState<'idle' | 'running' | 'finished'>(() => {
    try {
      return (localStorage.getItem(`architectmind:practiceState:${question.id}`) as any) || 'idle'
    } catch {
      return 'idle'
    }
  })
  const [timeLeft, setTimeLeft] = useState(() => {
    try {
      const savedState = localStorage.getItem(`architectmind:practiceState:${question.id}`)
      const savedEndTime = localStorage.getItem(`architectmind:practiceEndTime:${question.id}`)
      if (savedState === 'finished') return 0
      if (savedState === 'running' && savedEndTime) {
        const remaining = Math.floor((parseInt(savedEndTime, 10) - Date.now()) / 1000)
        return remaining > 0 ? remaining : 0
      }
      return question.durationMinutes * 60
    } catch {
      return question.durationMinutes * 60
    }
  })

  const onSubmitRef = useRef(onSubmit)
  useEffect(() => {
    onSubmitRef.current = onSubmit
  }, [onSubmit])

  useEffect(() => {
    try {
      const savedState = localStorage.getItem(`architectmind:practiceState:${question.id}`) as any
      const savedEndTime = localStorage.getItem(`architectmind:practiceEndTime:${question.id}`)
      
      if (savedState) {
        setTestState(savedState)
        if (savedState === 'finished') {
          setTimeLeft(0)
        } else if (savedState === 'running' && savedEndTime) {
          const remaining = Math.floor((parseInt(savedEndTime, 10) - Date.now()) / 1000)
          setTimeLeft(remaining > 0 ? remaining : 0)
        } else {
          setTimeLeft(question.durationMinutes * 60)
        }
      } else {
        setTestState('idle')
        setTimeLeft(question.durationMinutes * 60)
      }
    } catch {
      setTestState('idle')
      setTimeLeft(question.durationMinutes * 60)
    }
    setCollapsed(false)
  }, [question])

  useEffect(() => {
    try {
      localStorage.setItem(`architectmind:practiceState:${question.id}`, testState)
    } catch {}
    if (onStateChange) onStateChange(testState)
  }, [testState, question.id, onStateChange])

  const handleStartTest = () => {
    setTestState('running')
    try {
      localStorage.setItem(`architectmind:practiceEndTime:${question.id}`, (Date.now() + question.durationMinutes * 60 * 1000).toString())
    } catch {}
    setTimeLeft(question.durationMinutes * 60)
  }

  useEffect(() => {
    if (testState !== 'running') return
    if (timeLeft <= 0) {
      setTestState('finished')
      onSubmitRef.current()
      return
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [testState, timeLeft])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleSubmit = () => {
    setTestState('finished')
    onSubmitRef.current()
  }

  const handleReset = () => {
    setTestState('idle')
    setTimeLeft(question.durationMinutes * 60)
    try {
      localStorage.removeItem(`architectmind:practiceState:${question.id}`)
      localStorage.removeItem(`architectmind:practiceEndTime:${question.id}`)
    } catch {}
  }

  return (
    <section
      aria-label={`${question.title} practice question`}
      style={{
        position: 'absolute',
        top: 18,
        right: 18,
        width: collapsed ? 176 : 'min(360px, calc(100% - 36px))',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        background: 'var(--bg-secondary)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.14)',
        color: 'var(--text-secondary)',
        zIndex: 10,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        transition: 'width 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minHeight: 42,
          padding: '0 8px 0 14px',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-color)',
        }}
      >
        <strong
          style={{
            marginRight: 'auto',
            color: 'var(--text-primary)',
            fontSize: 14,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {question.title}
        </strong>
        {!collapsed && (
          <span style={{ 
            color: testState === 'running' && timeLeft <= 60 ? '#ef4444' : 'var(--text-secondary)', 
            fontSize: 12, 
            fontWeight: testState === 'running' ? 600 : 400, 
            fontFamily: testState !== 'idle' ? 'monospace' : 'inherit'
          }}>
            {testState === 'idle' ? `${question.durationMinutes} mins` : formatTime(timeLeft)}
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand question' : 'Collapse question'}
          style={{
            width: 32,
            height: 32,
            display: 'grid',
            placeItems: 'center',
            border: 0,
            borderRadius: 5,
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 18,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-primary)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          {collapsed ? '+' : '−'}
        </button>
      </div>

      {!collapsed && testState === 'idle' && (
        <div style={{ padding: 14, fontSize: 12, lineHeight: 1.55 }}>
          <p style={{ margin: '0 0 10px', color: 'var(--text-primary)' }}>
            Are you ready to start this practice? The timer will begin once you start. You cannot pause the timer, but you can submit early.
          </p>
          <button
            type="button"
            onClick={handleStartTest}
            style={{
              width: '100%',
              marginTop: 14,
              padding: '9px 12px',
              border: 0,
              borderRadius: 6,
              background: 'var(--accent)',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Start test
          </button>
        </div>
      )}

      {!collapsed && testState !== 'idle' && (
        <div style={{ padding: 14, fontSize: 12, lineHeight: 1.55 }}>
          <p style={{ margin: '0 0 10px', color: 'var(--text-primary)' }}>
            {question.description}
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-primary)' }}>
            {question.requirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={testState === 'finished' ? handleReset : handleSubmit}
            disabled={isSubmitting}
            style={{
              width: '100%',
              marginTop: 14,
              padding: '9px 12px',
              borderRadius: 6,
              background: isSubmitting ? 'var(--bg-tertiary)' : testState === 'finished' ? 'var(--bg-primary)' : 'var(--accent)',
              color: isSubmitting ? 'var(--text-secondary)' : testState === 'finished' ? 'var(--text-primary)' : '#ffffff',
              border: testState === 'finished' ? '1px solid var(--border-color)' : 'none',
              fontSize: 12,
              fontWeight: 500,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Analyzing...' : testState === 'finished' ? 'Try Again' : 'Submit for review'}
          </button>
        </div>
      )}
    </section>
  )
}

export default PracticeBrief
