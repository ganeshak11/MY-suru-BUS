export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
                <p className="text-secondary text-sm font-medium">Loading...</p>
            </div>
        </div>
    );
}
