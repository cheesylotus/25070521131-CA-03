import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  CircleCheck,
  CreditCard,
  Database,
  FileDown,
  Home,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UserRound,
  Wallet,
  X,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const CATEGORIES = [
  { name: 'Food & dining', color: '#f2a58a', icon: 'FD' },
  { name: 'Transport', color: '#78a99d', icon: 'TR' },
  { name: 'Shopping', color: '#d8b46b', icon: 'SH' },
  { name: 'Bills', color: '#8295b0', icon: 'BI' },
  { name: 'Health', color: '#c88e9c', icon: 'HE' },
  { name: 'Entertainment', color: '#a898c3', icon: 'EN' },
  { name: 'Other', color: '#8c9888', icon: 'OT' },
];

const DEFAULT_PREFERENCES = {
  displayName: 'My account',
  email: '',
  currency: import.meta.env.VITE_CURRENCY || 'USD',
  monthlyBudget: 0,
  weekStartsOn: 'Monday',
};

function dateOnly(value) {
  return String(value).slice(0, 10);
}

function formatCurrency(value, currencyCode = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function currencySymbol(currencyCode) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode })
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value || '$';
}

function downloadCsv(expenses) {
  const rows = [['Description', 'Category', 'Date', 'Amount', 'Note'], ...expenses.map((expense) => [
    expense.title,
    expense.category,
    dateOnly(expense.date),
    expense.amount,
    expense.note || '',
  ])];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  link.download = 'flexi-expenses.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function dateAtLocalNoon(value) {
  return new Date(`${dateOnly(value)}T12:00:00`);
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dateAtLocalNoon(value));
}

function categoryFor(name) {
  return CATEGORIES.find((category) => category.name === name) || CATEGORIES.at(-1);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(date) {
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date);
}

function App() {
  const [expenses, setExpenses] = useState([]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [databaseConnected, setDatabaseConnected] = useState(false);
  const [apiError, setApiError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [activeView, setActiveView] = useState('overview');
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [transactionPeriod, setTransactionPeriod] = useState('This month');
  const [menuOpen, setMenuOpen] = useState(false);
  const today = new Date();

  useEffect(() => {
    let active = true;

    fetch(`${API_BASE}/expenses`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load expenses.');
        return response.json();
      })
      .then((data) => {
        if (active) setExpenses(data);
      })
      .catch(() => {
        if (active) setDatabaseConnected(false);
        if (active) setApiError('Could not connect to MongoDB. Start the API and check your connection settings.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetch(`${API_BASE}/preferences`).then((response) => {
        if (!response.ok) throw new Error('Could not load preferences.');
        return response.json();
      }),
      fetch(`${API_BASE}/health`).then((response) => {
        if (!response.ok) throw new Error('Could not check the database connection.');
        return response.json();
      }),
    ])
      .then(([savedPreferences, health]) => {
        if (!active) return;
        setPreferences({ ...DEFAULT_PREFERENCES, ...savedPreferences });
        setDatabaseConnected(health.database === 'connected');
      })
      .catch(() => {
        if (active) setApiError('Could not load your account settings. Check the API connection.');
      })
      .finally(() => {
        if (active) setPreferencesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const formatAmount = (value) => formatCurrency(value, preferences.currency);

  const currentMonthExpenses = useMemo(() => {
    const monthStart = startOfMonth(today);
    return expenses.filter((expense) => dateAtLocalNoon(expense.date) >= monthStart);
  }, [expenses]);

  const monthTotal = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const averageExpense = currentMonthExpenses.length ? monthTotal / currentMonthExpenses.length : 0;
  const budgetPercent = preferences.monthlyBudget
    ? Math.min((monthTotal / preferences.monthlyBudget) * 100, 100)
    : 0;
  const budgetRemaining = Math.max(preferences.monthlyBudget - monthTotal, 0);

  const categoryTotals = useMemo(() => {
    const totals = new Map();
    currentMonthExpenses.forEach((expense) => {
      totals.set(expense.category, (totals.get(expense.category) || 0) + expense.amount);
    });
    return [...totals.entries()]
      .map(([name, amount]) => ({ name, amount, ...categoryFor(name) }))
      .sort((a, b) => b.amount - a.amount);
  }, [currentMonthExpenses]);

  const weekBars = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const amount = expenses
        .filter((expense) => dateOnly(expense.date) === key)
        .reduce((sum, expense) => sum + expense.amount, 0);
      return {
        label: new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date),
        amount,
        isToday: index === 6,
      };
    });
    const max = Math.max(...days.map((day) => day.amount), 1);
    return days.map((day) => ({ ...day, height: day.amount ? Math.max(10, (day.amount / max) * 100) : 3 }));
  }, [expenses]);

  const visibleExpenses = useMemo(() => {
    const source = transactionPeriod === 'This month' ? currentMonthExpenses : expenses;
    return source
      .filter((expense) => categoryFilter === 'All categories' || expense.category === categoryFilter)
      .filter((expense) => `${expense.title} ${expense.category}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [categoryFilter, currentMonthExpenses, expenses, query, transactionPeriod]);

  async function saveExpense(expense, id) {
    setApiError('');
    try {
      const response = await fetch(`${API_BASE}/expenses${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not save this expense.');
      setExpenses((previous) => id
        ? previous.map((item) => item._id === id ? data : item)
        : [data, ...previous]);
      setIsModalOpen(false);
      setEditingExpense(null);
    } catch (error) {
      setApiError(error.message || 'Could not save this expense. Check the API connection.');
      throw error;
    }
  }

  async function savePreferences(nextPreferences) {
    setApiError('');
    setPreferencesSaving(true);
    try {
      const response = await fetch(`${API_BASE}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextPreferences),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not save your settings.');
      setPreferences({ ...DEFAULT_PREFERENCES, ...data });
      return data;
    } catch (error) {
      setApiError(error.message || 'Could not save your settings.');
      throw error;
    } finally {
      setPreferencesSaving(false);
    }
  }

  async function deleteExpense(id) {
    setApiError('');
    try {
      const response = await fetch(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Could not delete this expense.');
      setExpenses((previous) => previous.filter((expense) => expense._id !== id));
      return true;
    } catch (error) {
      setApiError(error.message || 'Could not delete this expense.');
      return false;
    }
  }

  function exportCsv() {
    downloadCsv(visibleExpenses);
    setMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="FLEXI overview">
          <span className="brand-mark"><span /></span>
          <span>flexi<span className="brand-period">.</span></span>
        </a>

        <div className="workspace-label">PERSONAL SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <button className={`nav-item ${activeView === 'overview' ? 'active' : ''}`} onClick={() => setActiveView('overview')} type="button"><Home size={17} strokeWidth={1.8} /><span>Overview</span></button>
          <button className={`nav-item ${activeView === 'transactions' ? 'active' : ''}`} onClick={() => setActiveView('transactions')} type="button"><CreditCard size={17} strokeWidth={1.8} /><span>Transactions</span><span className="nav-count">{expenses.length}</span></button>
          <button className={`nav-item ${activeView === 'account' ? 'active' : ''}`} onClick={() => setActiveView('account')} type="button"><UserRound size={17} strokeWidth={1.8} /><span>Account</span></button>
          <button className={`nav-item ${activeView === 'settings' ? 'active' : ''}`} onClick={() => setActiveView('settings')} type="button"><Settings2 size={17} strokeWidth={1.8} /><span>Settings</span></button>
        </nav>

        <div className="sidebar-bottom">
          <div className="tip-card">
            <div className="tip-icon"><Sparkles size={16} /></div>
            <p className="tip-title">Small steps add up.</p>
            <p className="tip-copy">A little awareness goes a long way toward your goals.</p>
            <span className="tip-decoration">✳</span>
          </div>
          <button className="profile-row" onClick={() => setActiveView('account')} type="button" aria-label="Open account page">
            <span className="avatar">{preferences.displayName.charAt(0).toUpperCase()}</span>
            <span className="profile-copy"><strong>{preferences.displayName}</strong><small>Personal account</small></span>
            <MoreHorizontal size={19} />
          </button>
        </div>
      </aside>

      <main className="main-content" id={activeView}>
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>{activeView === 'account' ? 'Account' : activeView === 'settings' ? 'Settings' : activeView === 'transactions' ? 'Transactions' : 'Overview'}</strong></div>
          <div className="topbar-right">
            <span className="today-label"><CalendarDays size={15} />{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(today)}</span>
            <button className="help-button" type="button" aria-label="Help"><CircleHelp size={18} /></button>
          </div>
        </header>

        <div className="page-content">
          {activeView === 'overview' && <>
          <section className="page-heading">
            <div>
              <p className="eyebrow">YOUR MONEY, IN FOCUS</p>
              <h1>Overview<span className="heading-dot">.</span></h1>
              <p className="heading-subtitle">A little clarity for your everyday spending.</p>
            </div>
            <button className="primary-button" onClick={() => { setEditingExpense(null); setIsModalOpen(true); }} type="button"><Plus size={17} /> Add expense</button>
          </section>

          {apiError && <div className="connection-alert" role="alert"><span className="alert-dot" />{apiError}</div>}

          <section className="summary-grid" aria-label="Expense summary">
            <article className="summary-card summary-primary">
              <div className="summary-top"><span className="summary-label">Spent this month</span><span className="summary-icon"><Wallet size={17} /></span></div>
              <div className="summary-value">{formatAmount(monthTotal)}</div>
              <div className="summary-foot"><span className="summary-period"><CalendarDays size={13} /> {monthLabel(today)}</span><span className="summary-caption">across all expenses</span></div>
              <span className="summary-watermark">$</span>
            </article>
            <article className="summary-card">
              <div className="summary-top"><span className="summary-label">Transactions</span><span className="summary-icon icon-sage"><ArrowDownLeft size={17} /></span></div>
              <div className="summary-value">{currentMonthExpenses.length}<span className="value-unit"> entries</span></div>
              <div className="summary-foot"><span className="summary-caption">recorded this month</span><span className="summary-caption">{expenses.length} total</span></div>
            </article>
            <article className="summary-card">
              <div className="summary-top"><span className="summary-label">Average expense</span><span className="summary-icon icon-peach"><ArrowUpRight size={17} /></span></div>
              <div className="summary-value">{formatAmount(averageExpense)}</div>
              <div className="summary-foot"><span className="summary-caption">per transaction</span><span className="trend-note"><span className="trend-dot" /> this month</span></div>
            </article>
            <article className="summary-card budget-card">
              <div className="summary-top"><span className="summary-label">Monthly budget</span><span className="summary-icon icon-sage"><ShieldCheck size={17} /></span></div>
              <div className="summary-value">{preferences.monthlyBudget ? formatAmount(preferences.monthlyBudget) : 'Not set'}</div>
              <div className="budget-meter"><span style={{ width: `${budgetPercent}%` }} /></div>
              <div className="summary-foot"><span className="summary-caption">{preferences.monthlyBudget ? `${formatAmount(budgetRemaining)} left` : 'Set a monthly limit'}</span><button className="inline-link" type="button" onClick={() => setActiveView('settings')}>{preferences.monthlyBudget ? 'Manage' : 'Set budget'}</button></div>
            </article>
          </section>

          <section className="analytics-grid">
            <article className="panel spending-panel">
              <div className="panel-heading">
                <div><p className="panel-kicker">SPENDING ACTIVITY</p><h2>Daily outflow</h2></div>
                <span className="category-month">Last 7 days</span>
              </div>
              <div className="chart-total"><strong>{formatAmount(weekBars.reduce((sum, day) => sum + day.amount, 0))}</strong><span>in the last 7 days</span></div>
              <div className="bar-chart" role="img" aria-label="Daily spending over the last seven days">
                {weekBars.map((day) => (
                  <div className="bar-column" key={day.label}>
                    <div className="bar-track"><span className={`bar-fill ${day.isToday ? 'today' : ''}`} style={{ height: `${day.height}%` }} title={formatAmount(day.amount)} /></div>
                    <span className={`bar-label ${day.isToday ? 'today-label' : ''}`}>{day.label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel category-panel">
              <div className="panel-heading">
                <div><p className="panel-kicker">WHERE IT GOES</p><h2>By category</h2></div>
                <span className="category-month">{new Intl.DateTimeFormat(undefined, { month: 'short' }).format(today)}</span>
              </div>
              {categoryTotals.length ? (
                <div className="category-list">
                  {categoryTotals.slice(0, 4).map((category) => (
                    <div className="category-row" key={category.name}>
                      <span className="category-badge" style={{ '--category-color': category.color }}>{category.icon}</span>
                      <div className="category-info"><span>{category.name}</span><div className="category-meter"><span style={{ width: `${Math.max(4, (category.amount / monthTotal) * 100)}%`, background: category.color }} /></div></div>
                      <strong>{formatAmount(category.amount)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="category-empty"><span className="empty-orbit">✳</span><p>Your categories will show up here.</p><small>Add an expense to get started.</small></div>
              )}
              <div className="category-foot"><span><span className="legend-dot" /> Spending distribution</span><span>{categoryTotals.length} categories</span></div>
            </article>
          </section>

          <section className="panel transactions-panel" id="transactions">
            <div className="transactions-heading">
              <div><p className="panel-kicker">YOUR ACTIVITY</p><h2>Recent transactions <span className="transaction-count">{visibleExpenses.length}</span></h2></div>
              <div className="transaction-actions">
                <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expenses" aria-label="Search expenses" /></label>
                <label className="filter-select"><CalendarDays size={15} /><select value={transactionPeriod} onChange={(event) => setTransactionPeriod(event.target.value)} aria-label="Filter by time period"><option>This month</option><option>All time</option></select><ChevronDown size={13} /></label>
                <label className="filter-select"><SlidersHorizontal size={15} /><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category"><option>All categories</option>{CATEGORIES.map((category) => <option key={category.name}>{category.name}</option>)}</select><ChevronDown size={13} /></label>
                <div className="more-wrap">
                  <button className="icon-button" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="More transaction actions"><MoreHorizontal size={19} /></button>
                  {menuOpen && <div className="action-menu"><button type="button" onClick={exportCsv}><FileDown size={15} /> Export CSV</button></div>}
                </div>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th className="amount-cell">AMOUNT</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {loading ? <tr><td className="table-state" colSpan="5">Loading your expenses...</td></tr> : visibleExpenses.length ? visibleExpenses.slice(0, 8).map((expense) => {
                    const category = categoryFor(expense.category);
                    return <tr key={expense._id}>
                      <td><div className="transaction-name"><span className="transaction-icon" style={{ '--category-color': category.color }}>{category.icon}</span><strong>{expense.title}</strong></div></td>
                      <td><span className="category-pill"><span style={{ background: category.color }} />{expense.category}</span></td>
                      <td className="date-cell">{formatDate(expense.date)}</td>
                      <td className="amount-cell"><strong>{formatAmount(expense.amount)}</strong></td>
                      <td className="row-action-cell"><div className="row-actions"><button className="row-action" type="button" onClick={() => { setEditingExpense(expense); setIsModalOpen(true); }} aria-label={`Edit ${expense.title}`} title="Edit expense"><Pencil size={14} /></button><button className="row-action delete-action" type="button" onClick={() => deleteExpense(expense._id)} aria-label={`Delete ${expense.title}`} title="Delete expense"><Trash2 size={14} /></button></div></td>
                    </tr>;
                  }) : <tr><td className="table-state" colSpan="5"><div className="empty-table"><span className="empty-table-icon"><Wallet size={19} /></span><strong>No expenses to show</strong><span>{expenses.length ? 'Try changing your search or filters.' : 'Add your first expense to start seeing your spending.'}</span>{!expenses.length && <button className="text-action" type="button" onClick={() => setIsModalOpen(true)}>Add an expense <ArrowUpRight size={14} /></button>}</div></td></tr>}
                </tbody>
              </table>
            </div>
            {visibleExpenses.length > 8 && <div className="table-footer">Showing 8 of {visibleExpenses.length} transactions</div>}
          </section>

          <footer className="page-footer"><span><span className="footer-mark" /> FLEXI <span className="footer-divider">·</span> A clearer view of your spending</span><span>Your records are saved to MongoDB</span></footer>
          </>}

          {activeView === 'transactions' && <TransactionsPage expenses={expenses} loading={loading} currencyCode={preferences.currency} onEdit={(expense) => { setEditingExpense(expense); setIsModalOpen(true); }} onDelete={deleteExpense} onAdd={() => { setEditingExpense(null); setIsModalOpen(true); }} />}
          {activeView === 'account' && <AccountPage preferences={preferences} preferencesLoading={preferencesLoading} saving={preferencesSaving} onSave={savePreferences} expenses={expenses} databaseConnected={databaseConnected} onExport={() => downloadCsv(expenses)} />}
          {activeView === 'settings' && <SettingsPage preferences={preferences} preferencesLoading={preferencesLoading} saving={preferencesSaving} onSave={savePreferences} databaseConnected={databaseConnected} onExport={() => downloadCsv(expenses)} />}
        </div>
      </main>

      {isModalOpen && <ExpenseModal expense={editingExpense} currencyCode={preferences.currency} onClose={() => { setIsModalOpen(false); setEditingExpense(null); }} onSave={saveExpense} />}
    </div>
  );
}

function ExpenseModal({ expense, currencyCode, onClose, onSave }) {
  const [title, setTitle] = useState(expense?.title || '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [category, setCategory] = useState(expense?.category || CATEGORIES[0].name);
  const [date, setDate] = useState(expense ? dateOnly(expense.date) : new Date().toLocaleDateString('en-CA'));
  const [note, setNote] = useState(expense?.note || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ title: title.trim(), amount: Number(amount), category, date, note: note.trim() }, expense?._id);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header"><div><p className="panel-kicker">{expense ? 'EDIT TRANSACTION' : 'NEW TRANSACTION'}</p><h2 id="modal-title">{expense ? 'Edit expense' : 'Add an expense'}</h2></div><button className="icon-button modal-close" type="button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>
        <form onSubmit={handleSubmit}>
          <label className="form-label">What was it for?<input autoFocus required maxLength="80" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Lunch with friends" /></label>
          <div className="form-row">
            <label className="form-label">Amount<div className="amount-input"><span>{currencySymbol(currencyCode)}</span><input required type="number" min="0.01" max="100000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></div></label>
            <label className="form-label">Date<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          </div>
          <label className="form-label">Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORIES.map((item) => <option key={item.name}>{item.name}</option>)}</select></label>
          <label className="form-label">Note <span className="optional-label">OPTIONAL</span><textarea rows="2" maxLength="180" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a little context" /></label>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-footer"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving...' : <><Check size={16} /> {expense ? 'Save changes' : 'Save expense'}</>}</button></div>
        </form>
      </section>
    </div>
  );
}

function TransactionsPage({ expenses, loading, currencyCode, onEdit, onDelete, onAdd }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [period, setPeriod] = useState('All time');
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const pageSize = 10;

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);

    return expenses
      .filter((expense) => category === 'All categories' || expense.category === category)
      .filter((expense) => `${expense.title} ${expense.category} ${expense.note || ''}`.toLowerCase().includes(query.trim().toLowerCase()))
      .filter((expense) => {
        const expenseDate = dateAtLocalNoon(expense.date);
        if (period === 'This month') return expenseDate >= monthStart;
        if (period === 'Last month') return expenseDate >= previousMonthStart && expenseDate < monthStart;
        if (period === 'Last 90 days') return expenseDate >= ninetyDaysAgo;
        return true;
      })
      .sort((left, right) => {
        const leftValue = sortBy === 'date' ? new Date(left.date).getTime() : sortBy === 'amount' ? left.amount : left.title.toLowerCase();
        const rightValue = sortBy === 'date' ? new Date(right.date).getTime() : sortBy === 'amount' ? right.amount : right.title.toLowerCase();
        const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [category, expenses, period, query, sortBy, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageItems = filteredExpenses.slice((safePage - 1) * pageSize, safePage * pageSize);
  const filteredTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const thisMonthTotal = expenses
    .filter((expense) => dateAtLocalNoon(expense.date) >= startOfMonth(new Date()))
    .reduce((sum, expense) => sum + expense.amount, 0);
  const formatAmount = (value) => formatCurrency(value, currencyCode);
  const allPageSelected = pageItems.length > 0 && pageItems.every((expense) => selectedIds.includes(expense._id));

  function changeSort(field) {
    if (sortBy === field) {
      setSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection(field === 'title' ? 'asc' : 'desc');
    }
  }

  function setFilter(setter, value) {
    setter(value);
    setPage(1);
    setSelectedIds([]);
  }

  function togglePageSelection(checked) {
    const pageIds = pageItems.map((expense) => expense._id);
    setSelectedIds((previous) => checked
      ? [...new Set([...previous, ...pageIds])]
      : previous.filter((id) => !pageIds.includes(id)));
  }

  async function deleteSelected() {
    if (!selectedIds.length || !window.confirm(`Delete ${selectedIds.length} selected expense${selectedIds.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    const results = await Promise.all(selectedIds.map(onDelete));
    if (results.every(Boolean)) setSelectedIds([]);
  }

  function clearFilters() {
    setQuery('');
    setCategory('All categories');
    setPeriod('All time');
    setPage(1);
    setSelectedIds([]);
  }

  return (
    <>
      <section className="page-heading">
        <div><p className="eyebrow">EVERY ENTRY, IN ONE PLACE</p><h1>Transactions<span className="heading-dot">.</span></h1><p className="heading-subtitle">Search, review, and manage your spending history.</p></div>
        <button className="primary-button" onClick={onAdd} type="button"><Plus size={17} /> Add expense</button>
      </section>

      <section className="transaction-summary-grid" aria-label="Transaction summary">
        <article className="transaction-stat"><span>All transactions</span><strong>{expenses.length}</strong><small>saved in MongoDB</small></article>
        <article className="transaction-stat"><span>Filtered total</span><strong>{formatAmount(filteredTotal)}</strong><small>{filteredExpenses.length} matching entries</small></article>
        <article className="transaction-stat"><span>This month</span><strong>{formatAmount(thisMonthTotal)}</strong><small>month-to-date spending</small></article>
      </section>

      <section className="panel full-transactions-panel">
        <div className="full-transactions-heading">
          <div><p className="panel-kicker">LEDGER</p><h2>Expense history <span className="transaction-count">{filteredExpenses.length}</span></h2></div>
          <div className="full-transaction-controls">
            <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setFilter(setQuery, event.target.value)} placeholder="Search name, category, note" aria-label="Search transactions" /></label>
            <label className="filter-select"><CalendarDays size={15} /><select value={period} onChange={(event) => setFilter(setPeriod, event.target.value)} aria-label="Filter by date"><option>All time</option><option>This month</option><option>Last month</option><option>Last 90 days</option></select><ChevronDown size={13} /></label>
            <label className="filter-select"><SlidersHorizontal size={15} /><select value={category} onChange={(event) => setFilter(setCategory, event.target.value)} aria-label="Filter by category"><option>All categories</option>{CATEGORIES.map((item) => <option key={item.name}>{item.name}</option>)}</select><ChevronDown size={13} /></label>
            <button className="secondary-button export-button" onClick={() => downloadCsv(filteredExpenses)} type="button"><FileDown size={15} /> Export CSV</button>
          </div>
        </div>

        {selectedIds.length > 0 && <div className="bulk-toolbar"><span>{selectedIds.length} selected</span><button className="danger-button" onClick={deleteSelected} type="button"><Trash2 size={14} /> Delete selected</button></div>}

        <div className="table-wrap">
          <table className="ledger-table">
            <thead><tr>
              <th className="select-cell"><input type="checkbox" checked={allPageSelected} onChange={(event) => togglePageSelection(event.target.checked)} aria-label="Select all transactions on this page" /></th>
              <th><button className="sort-button" onClick={() => changeSort('title')} type="button">DESCRIPTION <ChevronDown size={12} /></button></th>
              <th>CATEGORY</th>
              <th><button className="sort-button" onClick={() => changeSort('date')} type="button">DATE <ChevronDown size={12} /></button></th>
              <th>NOTE</th>
              <th className="amount-cell"><button className="sort-button" onClick={() => changeSort('amount')} type="button">AMOUNT <ChevronDown size={12} /></button></th>
              <th><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td className="table-state" colSpan="7">Loading transactions...</td></tr> : pageItems.length ? pageItems.map((expense) => {
                const itemCategory = categoryFor(expense.category);
                return <tr key={expense._id}>
                  <td className="select-cell"><input type="checkbox" checked={selectedIds.includes(expense._id)} onChange={(event) => setSelectedIds((previous) => event.target.checked ? [...previous, expense._id] : previous.filter((id) => id !== expense._id))} aria-label={`Select ${expense.title}`} /></td>
                  <td><div className="transaction-name"><span className="transaction-icon" style={{ '--category-color': itemCategory.color }}>{itemCategory.icon}</span><strong>{expense.title}</strong></div></td>
                  <td><span className="category-pill"><span style={{ background: itemCategory.color }} />{expense.category}</span></td>
                  <td className="date-cell">{formatDate(expense.date)}</td>
                  <td className="note-cell" title={expense.note || ''}>{expense.note || '—'}</td>
                  <td className="amount-cell"><strong>{formatAmount(expense.amount)}</strong></td>
                  <td className="row-action-cell"><div className="row-actions"><button className="row-action" type="button" onClick={() => onEdit(expense)} aria-label={`Edit ${expense.title}`} title="Edit expense"><Pencil size={14} /></button><button className="row-action delete-action" type="button" onClick={() => onDelete(expense._id)} aria-label={`Delete ${expense.title}`} title="Delete expense"><Trash2 size={14} /></button></div></td>
                </tr>;
              }) : <tr><td className="table-state" colSpan="7"><div className="empty-table"><span className="empty-table-icon"><CreditCard size={19} /></span><strong>{expenses.length ? 'No matching transactions' : 'Your ledger is ready'}</strong><span>{expenses.length ? 'Try adjusting your filters or search.' : 'Add an expense and it will appear here.'}</span>{expenses.length ? <button className="text-action" onClick={clearFilters} type="button">Clear filters</button> : <button className="text-action" onClick={onAdd} type="button">Add your first expense <ArrowUpRight size={14} /></button>}</div></td></tr>}
            </tbody>
          </table>
        </div>

        <div className="ledger-footer"><span>{filteredExpenses.length ? `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filteredExpenses.length)} of ${filteredExpenses.length}` : 'No entries'}</span><div className="pagination"><button className="secondary-button" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">Previous</button><span>Page {safePage} of {pageCount}</span><button className="secondary-button" disabled={safePage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">Next</button></div></div>
      </section>
    </>
  );
}

function AccountPage({ preferences, preferencesLoading, saving, onSave, expenses, databaseConnected, onExport }) {
  const [displayName, setDisplayName] = useState(preferences.displayName);
  const [email, setEmail] = useState(preferences.email);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  useEffect(() => {
    setDisplayName(preferences.displayName);
    setEmail(preferences.email);
  }, [preferences.displayName, preferences.email]);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await onSave({ ...preferences, displayName: displayName.trim(), email: email.trim() });
      setMessage('Profile saved to MongoDB.');
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  return (
    <>
      <section className="page-heading"><div><p className="eyebrow">YOUR PERSONAL SPACE</p><h1>Account<span className="heading-dot">.</span></h1><p className="heading-subtitle">Manage your profile and review your account activity.</p></div></section>
      <section className="account-hero panel"><span className="account-avatar">{(displayName || 'M').charAt(0).toUpperCase()}</span><div className="account-hero-copy"><span className="panel-kicker">PERSONAL ACCOUNT</span><h2>{displayName || 'My account'}</h2><p>{email || 'Add an email address to your profile'}</p></div><span className="account-type"><UserRound size={14} /> Personal</span></section>
      <div className="account-layout">
        <section className="panel settings-panel">
          <div className="section-title"><div><p className="panel-kicker">PROFILE DETAILS</p><h2>Account information</h2></div><span className="section-icon"><UserRound size={17} /></span></div>
          {preferencesLoading ? <p className="muted-copy">Loading your account...</p> : <form className="settings-form" onSubmit={submit}>
            <label className="form-label">Display name<input required maxLength="60" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></label>
            <label className="form-label">Email address <span className="optional-label">OPTIONAL</span><input type="email" maxLength="120" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label>
            <p className="muted-copy">This is a local personal profile. Sign-in and cloud sync are not enabled.</p>
            {message && <p className="success-message"><CircleCheck size={15} />{message}</p>}
            {error && <p className="form-error">{error}</p>}
            <div className="settings-actions"><button className="primary-button" type="submit" disabled={saving}><Save size={15} />{saving ? 'Saving...' : 'Save profile'}</button></div>
          </form>}
        </section>

        <section className="panel account-activity-panel">
          <div className="section-title"><div><p className="panel-kicker">ACCOUNT ACTIVITY</p><h2>Your tracker</h2></div><span className="section-icon"><Wallet size={17} /></span></div>
          <div className="activity-stat"><span>Total expenses recorded</span><strong>{expenses.length}</strong></div>
          <div className="activity-stat"><span>All-time spending</span><strong>{formatCurrency(totalSpent, preferences.currency)}</strong></div>
          <div className="activity-stat"><span>Preferred currency</span><strong>{preferences.currency}</strong></div>
          <div className="account-data-status"><span className={`status-mark ${databaseConnected ? 'connected' : ''}`} /><span><strong>{databaseConnected ? 'MongoDB connected' : 'Database disconnected'}</strong><small>Expense data is stored in your database</small></span><Database size={17} /></div>
          <button className="secondary-button export-button" onClick={onExport} type="button"><FileDown size={15} /> Export all transactions</button>
        </section>
      </div>
    </>
  );
}

function SettingsPage({ preferences, preferencesLoading, saving, onSave, databaseConnected, onExport }) {
  const [currency, setCurrency] = useState(preferences.currency);
  const [monthlyBudget, setMonthlyBudget] = useState(String(preferences.monthlyBudget || ''));
  const [weekStartsOn, setWeekStartsOn] = useState(preferences.weekStartsOn);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setCurrency(preferences.currency);
    setMonthlyBudget(String(preferences.monthlyBudget || ''));
    setWeekStartsOn(preferences.weekStartsOn);
  }, [preferences.currency, preferences.monthlyBudget, preferences.weekStartsOn]);

  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      await onSave({ ...preferences, currency, monthlyBudget: Number(monthlyBudget) || 0, weekStartsOn });
      setMessage('Preferences saved to MongoDB.');
    } catch (saveError) {
      setError(saveError.message);
    }
  }

  return (
    <>
      <section className="page-heading"><div><p className="eyebrow">MAKE FLEXI YOURS</p><h1>Settings<span className="heading-dot">.</span></h1><p className="heading-subtitle">Set the defaults used throughout your expense tracker.</p></div></section>
      <div className="account-layout settings-layout">
        <section className="panel settings-panel">
          <div className="section-title"><div><p className="panel-kicker">SPENDING PREFERENCES</p><h2>Budget & display</h2></div><span className="section-icon"><Settings2 size={17} /></span></div>
          {preferencesLoading ? <p className="muted-copy">Loading your settings...</p> : <form className="settings-form" onSubmit={submit}>
            <label className="form-label">Display currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}>{[['USD', 'US Dollar'], ['EUR', 'Euro'], ['GBP', 'British Pound'], ['CAD', 'Canadian Dollar'], ['AUD', 'Australian Dollar'], ['INR', 'Indian Rupee'], ['JPY', 'Japanese Yen']].map(([code, label]) => <option value={code} key={code}>{code} · {label}</option>)}</select><small className="field-help">All amounts and exports use this currency. Existing expense amounts are not converted.</small></label>
            <label className="form-label">Monthly spending limit<div className="amount-input"><span>{currencySymbol(currency)}</span><input type="number" min="0" max="100000000" step="0.01" value={monthlyBudget} onChange={(event) => setMonthlyBudget(event.target.value)} placeholder="0.00" /></div><small className="field-help">Set to zero to leave the budget unset.</small></label>
            <label className="form-label">Week starts on<select value={weekStartsOn} onChange={(event) => setWeekStartsOn(event.target.value)}><option>Monday</option><option>Sunday</option></select><small className="field-help">Used for weekly spending summaries.</small></label>
            {message && <p className="success-message"><CircleCheck size={15} />{message}</p>}
            {error && <p className="form-error">{error}</p>}
            <div className="settings-actions"><button className="primary-button" type="submit" disabled={saving}><Save size={15} />{saving ? 'Saving...' : 'Save settings'}</button></div>
          </form>}
        </section>

        <section className="panel data-settings-panel">
          <div className="section-title"><div><p className="panel-kicker">DATA & STORAGE</p><h2>Database status</h2></div><span className="section-icon"><Database size={17} /></span></div>
          <div className="account-data-status"><span className={`status-mark ${databaseConnected ? 'connected' : ''}`} /><span><strong>{databaseConnected ? 'Connected to MongoDB' : 'MongoDB unavailable'}</strong><small>{databaseConnected ? 'Changes save directly to your local database.' : 'Check that MongoDB Server is running.'}</small></span></div>
          <div className="data-action-row"><div><strong>Export expense data</strong><small>Download all transactions as a CSV file.</small></div><button className="secondary-button" onClick={onExport} type="button"><FileDown size={15} /> Export</button></div>
          <div className="data-action-row"><div><strong>Profile & preferences</strong><small>Stored alongside your expense data in MongoDB.</small></div><ShieldCheck size={17} className="data-confirm-icon" /></div>
          <p className="muted-copy">FLEXI currently runs as a single-user local tracker. Database access is controlled by your local MongoDB connection.</p>
        </section>
      </div>
    </>
  );
}

export default App;