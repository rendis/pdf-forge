//go:build integration

package testpostgres

import (
	"context"
	"strconv"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"

	"github.com/docker/go-connections/nat"

	pgadapter "github.com/rendis/pdf-forge/core/internal/adapters/secondary/database/postgres"
	"github.com/rendis/pdf-forge/core/internal/infra/config"
	"github.com/rendis/pdf-forge/core/internal/migrations"
)

const (
	defaultDBName       = "pdf_forge_test"
	defaultDBUser       = "postgres"
	defaultDBPassword   = "postgres"
	defaultSnapshotName = "pdf_forge_baseline"
)

// Container wraps a PostgreSQL Testcontainers instance configured for integration tests.
type Container struct {
	Postgres         *tcpostgres.PostgresContainer
	Config           config.DatabaseConfig
	ConnectionString string
	snapshotName     string
}

// Run starts a PostgreSQL container, applies migrations, and snapshots the baseline state.
func Run(ctx context.Context, t *testing.T) *Container {
	t.Helper()

	ctr, err := tcpostgres.Run(
		ctx,
		"postgres:16-alpine",
		tcpostgres.WithDatabase(defaultDBName),
		tcpostgres.WithUsername(defaultDBUser),
		tcpostgres.WithPassword(defaultDBPassword),
		tcpostgres.BasicWaitStrategies(),
		tcpostgres.WithSQLDriver("pgx"),
	)
	require.NoError(t, err)
	testcontainers.CleanupContainer(t, ctr)

	host, err := ctr.Host(ctx)
	require.NoError(t, err)

	mappedPort, err := ctr.MappedPort(ctx, nat.Port("5432/tcp"))
	require.NoError(t, err)

	portNum, err := strconv.Atoi(mappedPort.Port())
	require.NoError(t, err)

	cfg := config.DatabaseConfig{
		Host:               host,
		Port:               portNum,
		User:               defaultDBUser,
		Password:           defaultDBPassword,
		Name:               defaultDBName,
		SSLMode:            "disable",
		MaxPoolSize:        10,
		MinPoolSize:        1,
		MaxIdleTimeSeconds: 30,
	}

	require.NoError(t, migrations.Run(&cfg))

	connString, err := ctr.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	require.NoError(t, ctr.Snapshot(ctx, tcpostgres.WithSnapshotName(defaultSnapshotName)))

	return &Container{
		Postgres:         ctr,
		Config:           cfg,
		ConnectionString: connString,
		snapshotName:     defaultSnapshotName,
	}
}

// Restore resets the test database to the post-migration baseline snapshot.
func (c *Container) Restore(ctx context.Context, t *testing.T) {
	t.Helper()
	require.NoError(t, c.Postgres.Restore(ctx, tcpostgres.WithSnapshotName(c.snapshotName)))
}

// NewPool creates a pgx pool using the repository's standard Postgres config path.
func (c *Container) NewPool(ctx context.Context) (*pgxpool.Pool, error) {
	return pgadapter.NewPool(ctx, &c.Config)
}
