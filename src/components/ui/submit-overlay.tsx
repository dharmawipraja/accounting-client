import { Loader2 } from 'lucide-react'

interface SubmitOverlayProps {
  isVisible: boolean
  message?: string
}

export function SubmitOverlay({
  isVisible,
  message = 'Saving changes...',
}: SubmitOverlayProps) {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center space-y-4 max-w-sm mx-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-medium text-gray-900">{message}</p>
        <p className="text-sm text-gray-500 text-center">
          Please wait while we process your request...
        </p>
      </div>
    </div>
  )
}

// Progress bar component for multi-step operations
interface ProgressBarProps {
  progress: number // 0-100
  message?: string
  showPercentage?: boolean
}

export function ProgressBar({
  progress,
  message,
  showPercentage = true,
}: ProgressBarProps) {
  return (
    <div className="w-full space-y-2">
      {message && (
        <div className="flex justify-between items-center">
          <p className="text-sm font-medium text-gray-700">{message}</p>
          {showPercentage && (
            <span className="text-sm text-gray-500">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  )
}
