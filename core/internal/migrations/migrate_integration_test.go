//go:build integration

package migrations_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rendis/pdf-forge/core/internal/testutil/testpostgres"
)

func TestPostgresIntegration_MigrationsAndRestore(t *testing.T) {
	ctx := context.Background()
	pg := testpostgres.Run(ctx, t)

	t.Run("migrations create expected schema", func(t *testing.T) {
		pool, err := pg.NewPool(ctx)
		require.NoError(t, err)
		t.Cleanup(pool.Close)

		var tenantsExists bool
		err = pool.QueryRow(ctx, `
			SELECT EXISTS (
				SELECT FROM information_schema.tables
				WHERE table_schema = 'tenancy' AND table_name = 'tenants'
			)
		`).Scan(&tenantsExists)
		require.NoError(t, err)
		assert.True(t, tenantsExists)

		var usersExists bool
		err = pool.QueryRow(ctx, `
			SELECT EXISTS (
				SELECT FROM information_schema.tables
				WHERE table_schema = 'identity' AND table_name = 'users'
			)
		`).Scan(&usersExists)
		require.NoError(t, err)
		assert.True(t, usersExists)
	})

	t.Run("restore returns database to baseline snapshot", func(t *testing.T) {
		pool, err := pg.NewPool(ctx)
		require.NoError(t, err)

		_, err = pool.Exec(ctx, `CREATE TABLE public.restore_probe(id INT NOT NULL)`)
		require.NoError(t, err)
		_, err = pool.Exec(ctx, `INSERT INTO public.restore_probe(id) VALUES (1)`)
		require.NoError(t, err)
		pool.Close()

		pg.Restore(ctx, t)

		pool, err = pg.NewPool(ctx)
		require.NoError(t, err)
		t.Cleanup(pool.Close)

		var exists bool
		err = pool.QueryRow(ctx, `
			SELECT EXISTS (
				SELECT FROM information_schema.tables
				WHERE table_schema = 'public' AND table_name = 'restore_probe'
			)
		`).Scan(&exists)
		require.NoError(t, err)
		assert.False(t, exists)
	})
}
