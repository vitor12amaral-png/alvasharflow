## Causa raiz (única)

Auditei banco + rede. Todas as políticas RLS das tabelas do app (`clients`, `client_packages`, `videos`, `video_files`, `client_library`, `activity_log`, `profiles`, `user_roles`) chamam a função `has_role(uuid, app_role)`. Essa função **não tem permissão EXECUTE para o papel `authenticated`** — só `postgres`/`service_role` podem chamá-la.

Resultado observado nos logs de rede:
```
GET /rest/v1/clients → 403 "permission denied for function has_role"
GET /rest/v1/profiles → 403
GET /rest/v1/user_roles → 403
```

Isso explica os dois sintomas:

1. **Erro ao criar cliente** — o INSERT em `clients` invoca a policy `Staff manage clients` que chama `has_role` → negado.
2. **Lentidão** — cada tela dispara 4-5 consultas em paralelo. Todas falham. React Query faz retry automático 3x → cascata de dezenas de requisições 403 e re-renderizações.

## Correção

Migração única:

```sql
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
```

Não é necessário conceder para `anon` (nenhuma policy pública usa a função). As trigger functions `tg_log_*` continuam sem EXECUTE público — corretas: rodam como SECURITY DEFINER dentro dos triggers.

## Validação após aplicar

1. Recarregar `/clientes` → lista carrega (200) sem loop de retry.
2. Wizard "Novo cliente" → finalizar cadastro cria linha em `clients` + `client_packages` sem erro.
3. Timeline do dashboard e outras telas passam a responder.

## Fora do escopo

Nenhuma outra alteração. As policies, tabelas e triggers estão íntegras.
