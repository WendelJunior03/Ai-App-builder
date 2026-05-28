# App Architecture

Do not put all implementation in `src/App.tsx` or `src/app/App.tsx`.

- Use `src/app` only for app composition, providers and routes.
- Use `src/pages` for route-level pages.
- Use `src/features/<feature-name>` for business features.
- Use `src/features/<feature-name>/components` for feature-specific UI.
- Use `src/features/<feature-name>/hooks` for feature-specific hooks.
- Use `src/features/<feature-name>/services` for feature-specific data logic.
- Use `src/components/ui` for reusable primitive UI.
- Use `src/components/layout` for layout components.
- Use `src/domain` for business entities and rules.
- Use `src/application` for use cases.
- Use `src/infrastructure` for API clients, repositories, mocks and external integrations.
- Use `src/shared` for generic utilities, constants and shared types.
- Files that contain JSX must use the `.tsx` extension. Do not put JSX in `.ts` files.
- Hooks in `src/features/<feature-name>/hooks` should not render JSX. Providers or contexts that render JSX should be `.tsx`.
- Before importing a new page, component, hook or service, create the matching file at the imported path.

When adding a new screen or feature, create new files in the proper folders.
Keep `App.tsx` small.
