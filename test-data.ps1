# test-data.ps1
Write-Host "Creating test users and units..."

# Test users (no auth required in DEBUG mode)
$testUsers = @(
    @{ oid="test-oid-123"; name="John Doe"; email="john.doe@example.com"; role="STAFF" },
    @{ oid="admin-oid-456"; name="Admin User"; email="admin@example.com"; role="ADMIN" },
    @{ oid="auditor-oid-789"; name="Audit User"; email="audit@example.com"; role="AUDITOR" }
)

foreach ($user in $testUsers) {
    $body = @{
        m365_oid = $user.oid
        name = $user.name
        email = $user.email
        role = $user.role
        active = 1
    } | ConvertTo-Json

    curl -X POST "http://localhost:8000/test/register-user" -H "Content-Type: application/json" -d $body
    Write-Host "Created user: $($user.email)"
}

# Test units
$testUnits = @(
    @{ name="Piece"; symbol="pcs"; multiplier=1.0 },
    @{ name="Kilogram"; symbol="kg"; multiplier=1.0 },
    @{ name="Liter"; symbol="L"; multiplier=1.0 }
)

foreach ($unit in $testUnits) {
    $body = @{
        name = $unit.name
        symbol = $unit.symbol
        multiplier = $unit.multiplier
    } | ConvertTo-Json

    curl -X POST "http://localhost:8000/test/register-unit" -H "Content-Type: application/json" -d $body
    Write-Host "Created unit: $($unit.name)"
}

Write-Host "Test data creation complete!"