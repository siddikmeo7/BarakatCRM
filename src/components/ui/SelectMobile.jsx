import React, { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export default function SelectMobile({
  value,
  onValueChange,
  options = [],
  placeholder = "Select...",
  children,
  className,
  ...props
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 1024)

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(search.toLowerCase())
  )

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange} {...props}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    )
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
          className
        )}
      >
        <span className="text-sm">{value || placeholder}</span>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader className="border-b border-slate-200">
            <DrawerTitle>Select option</DrawerTitle>
          </DrawerHeader>

          <div className="p-4 space-y-3">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3"
            />

            <div className="space-y-1 max-h-[calc(80vh-180px)] overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => {
                      onValueChange(option)
                      setOpen(false)
                      setSearch("")
                    }}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-lg transition-colors",
                      value === option
                        ? "bg-indigo-50 text-indigo-600 font-medium"
                        : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {option}
                  </button>
                ))
              ) : (
                <p className="text-center text-slate-500 py-4">No options found</p>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}