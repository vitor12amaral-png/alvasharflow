<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- O mês da leva de um vídeo é `videos.competence_month`; prazo e competência são independentes para preservar pendências entre meses.
- Workflow ordering uses the existing video position field and an invoker RPC for atomic multi-row updates, so failed moves do not leave partial ordering.
- Video history reads the existing activity log; database triggers audit operational changes across every entry point without duplicating status/assignment events.
- Contextual next-stage actions and team lookup live in a shared operations module to keep cards and video details consistent.
- Batch views group existing video batch IDs by client and competence month through a shared pure helper; progress uses all monthly rows, not filtered rows, to keep delivery totals accurate without a new batch entity.
- Finance figures come from a shared pure helper: month value follows competence month, package usage counts linked videos (legacy unlinked ones by client family and creation date within the package period), so finance never depends on the old quota counter.
