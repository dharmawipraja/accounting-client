import { CheckIcon, ChevronDownIcon, SearchIcon } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

interface SearchableSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

interface SearchableSelectContentProps {
  children: React.ReactNode
  className?: string
}

interface SearchableSelectItemProps {
  value: string
  children: React.ReactNode
  onSelect?: (value: string) => void
  className?: string
}

interface SearchableSelectTriggerProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  isOpen?: boolean
}

const SearchableSelectContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
}>({
  isOpen: false,
  setIsOpen: () => { },
  searchTerm: '',
  setSearchTerm: () => { },
})

function SearchableSelect({
  value,
  onValueChange,
  className,
  children,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')

  const handleValueChange = (newValue: string) => {
    onValueChange?.(newValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  return (
    <SearchableSelectContext.Provider
      value={{
        value,
        onValueChange: handleValueChange,
        isOpen,
        setIsOpen,
        searchTerm,
        setSearchTerm,
      }}
    >
      <div className={cn('relative', className)}>{children}</div>
    </SearchableSelectContext.Provider>
  )
}

function SearchableSelectTrigger({
  children,
  className,
  onClick,
  isOpen = false,
}: SearchableSelectTriggerProps) {
  const { setIsOpen } = React.useContext(SearchableSelectContext)

  const handleClick = () => {
    if (!isOpen) {
      setIsOpen(true)
    }
    onClick?.()
  }

  return (
    <button
      type="button"
      className={cn(
        'border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*="text-"])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-9 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
        className,
      )}
      onClick={handleClick}
    >
      {children}
      <ChevronDownIcon className="opacity-50 size-4" />
    </button>
  )
}

function SearchableSelectContent({
  children,
  className,
}: SearchableSelectContentProps) {
  const { isOpen, setIsOpen, searchTerm, setSearchTerm } = React.useContext(
    SearchableSelectContext,
  )
  const [filteredChildren, setFilteredChildren] = React.useState<
    React.ReactNode[]
  >([])
  const contentRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Filter children based on search term
  React.useEffect(() => {
    if (!isOpen) return

    const filterChildren = (children: React.ReactNode): React.ReactNode[] => {
      return React.Children.toArray(children).filter((child) => {
        if (
          React.isValidElement(child) &&
          child.type === SearchableSelectItem
        ) {
          const itemText =
            (child.props as { children?: React.ReactNode }).children
              ?.toString()
              .toLowerCase() || ''
          return itemText.includes(searchTerm.toLowerCase())
        }
        return true
      })
    }

    setFilteredChildren(filterChildren(children))
  }, [children, searchTerm, isOpen])

  // Focus input when dropdown opens
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Handle click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, setIsOpen])

  if (!isOpen) return null

  return (
    <div
      ref={contentRef}
      className={cn(
        'absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden',
        className,
      )}
    >
      {/* Search Input */}
      <div className="p-2 border-b border-gray-100">
        <div className="relative">
          <SearchIcon className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2 size-4" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-2 pr-3 text-sm border border-gray-200 rounded-md pl-9 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Options List */}
      <div className="overflow-y-auto max-h-48">
        {filteredChildren.length > 0 ? (
          filteredChildren
        ) : (
          <div className="px-3 py-2 text-sm text-center text-gray-500">
            No accounts found
          </div>
        )}
      </div>
    </div>
  )
}

function SearchableSelectItem({
  value,
  children,
  onSelect,
  className,
}: SearchableSelectItemProps) {
  const { value: selectedValue, onValueChange } = React.useContext(
    SearchableSelectContext,
  )

  const handleClick = () => {
    onValueChange?.(value)
    onSelect?.(value)
  }

  const isSelected = selectedValue === value

  return (
    <button
      type="button"
      className={cn(
        'relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none hover:bg-gray-100 focus:bg-gray-100 transition-colors',
        isSelected && 'bg-blue-50 text-blue-900',
        className,
      )}
      onClick={handleClick}
    >
      <span className="flex-1 text-left">{children}</span>
      {isSelected && (
        <span className="absolute right-2 flex size-3.5 items-center justify-center">
          <CheckIcon className="text-blue-600 size-4" />
        </span>
      )}
    </button>
  )
}

export {
  SearchableSelect,
  SearchableSelectContent,
  SearchableSelectItem,
  SearchableSelectTrigger
}

