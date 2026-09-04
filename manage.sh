#!/usr/bin/env bash

# manage.sh for qonsulin-clone

set -e

function show_help {
    echo "Usage: ./manage.sh [command]"
    echo ""
    echo "Commands:"
    echo "  dev             Start the Next.js development server"
    echo "  build           Build the Next.js application for production"
    echo "  start           Start the Next.js production server"
    echo "  lint            Run ESLint"
    echo "  typecheck       Run TypeScript type checking"
    echo "  sync:live       Dry run sync to live Supabase"
    echo "  sync:live:push  Push sync to live Supabase"
    echo "  install         Install dependencies using pnpm"
    echo "  help            Show this help message"
}

case "$1" in
    dev)
        pnpm run dev
        ;;
    build)
        pnpm run build
        ;;
    start)
        pnpm run start
        ;;
    lint)
        pnpm run lint
        ;;
    typecheck)
        pnpm run typecheck
        ;;
    sync:live)
        pnpm run sync:live
        ;;
    sync:live:push)
        pnpm run sync:live:push
        ;;
    install)
        pnpm install
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        if [ -n "$1" ]; then
            echo "Unknown command: $1"
            echo ""
        fi
        show_help
        exit 1
        ;;
esac
