import React, { useState } from 'react';
import { useRouter } from '../../context/RouterContext';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  DollarSign,
  Users,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { Organization } from '../../types';
import { UserRoleDistributionCard } from './UserRoleDistributionCard';
import {
  PageHeader,
  MetricCard,
  DataTable,
  ConsoleCard,
  ConsoleButton,
  StatusChip,
  Reveal
} from '../ui';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { easings, tSpring, fadeUp, staggerContainerFast } from '../../lib/motion';

/** Inline onboarding modal shell: spring pop-in cascading title → form fields. */
const orgPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...tSpring, delayChildren: 0.05, staggerChildren: 0.06 }
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: { duration: 0.16, ease: easings.inOut }
  }
};

export const PlatformDashboard: React.FC = () => {
  const { navigate } = useRouter();
  const {
    organizations,
    toggleOrgStatus,
    changeOrgPlan,
    subscriptionPlans,
    createNewOrganization,
    students,
    setCurrentOrgId,
    switchRole,
    showToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNewOrgModal, setShowNewOrgModal] = useState<boolean>(false);
  const [newOrgName, setNewOrgName] = useState<string>('');
  const [newOrgOwner, setNewOrgOwner] = useState<string>('');
  const [newOrgPhone, setNewOrgPhone] = useState<string>('');
  const [newOrgCity, setNewOrgCity] = useState<string>('Dehradun');
  const [newOrgPlan, setNewOrgPlan] = useState<'starter' | 'growth' | 'pro'>('starter');

  // Compute platform-wide metrics
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter(o => o.subscriptionStatus === 'active' || o.subscriptionStatus === 'trial');
  const totalPlatformStudents = students.length;

  // Calculate simulated MRR
  const mrr = organizations.reduce((acc, org) => {
    if (org.subscriptionStatus === 'suspended') return acc;
    const plan = subscriptionPlans.find(p => p.id === org.planId);
    return acc + (plan?.priceMonthly || 599);
  }, 0);

  const filteredOrgs = organizations.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      await createNewOrganization({
        name: newOrgName,
        ownerName: newOrgOwner,
        phone: newOrgPhone,
        city: newOrgCity,
        planId: newOrgPlan
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not create organization.', 'error');
      return;
    }

    setShowNewOrgModal(false);
    setNewOrgName('');
    setNewOrgOwner('');
    setNewOrgPhone('');
  };

  const handleImpersonateCenter = (orgId: string) => {
    setCurrentOrgId(orgId);
    switchRole('CENTER_ADMIN');
    navigate(`/admin/${orgId}`);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 lg:p-8 space-y-4 sm:space-y-6">
      <div className="relative overflow-hidden rounded-[30px] border border-black/[0.06] dark:border-white/[0.08] bg-[radial-gradient(circle_at_top_left,_rgba(120,120,128,0.07),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(174,174,178,0.1),_transparent_25%),linear-gradient(180deg,rgba(255,255,255,0.78),rgba(242,242,244,0.96))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(174,174,178,0.06),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(174,174,178,0.08),_transparent_25%),linear-gradient(180deg,rgba(28,28,30,0.98),rgba(17,17,19,0.96))] p-3 sm:p-4 shadow-[0_20px_40px_rgba(15,23,42,0.04)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.35)]">
      {/* Platform Header */}
      <PageHeader
        breadcrumbs={[
          {
            label: 'VidyaOS Platform',
            onClick: () => navigate('/owner')
          },
          { label: 'Tenant Management' }
        ]}
        title="Platform Control Center"
        subtitle="Monitor multi-tenant coaching & education centers, subscription MRR, student quotas, and tenant isolation health"
        badge={
          <StatusChip label="GOOGLE CLOUD ADMIN CONSOLE" variant="info" size="xs" />
        }
        actions={
          <ConsoleButton
            variant="blue"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowNewOrgModal(true)}
          >
            Onboard New Center
          </ConsoleButton>
        }
      />
      </div>

      {/* KPI Stats */}
      <Reveal className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Monthly Recurring Revenue"
          value={`₹${(mrr ?? 0).toLocaleString('en-IN')}`}
          trend={{ value: '+18.4% this month', isPositive: true }}
          accentColor="#188038"
          icon={<DollarSign className="w-4 h-4" />}
        />

        <MetricCard
          label="Total Coaching Centers"
          value={totalOrgs}
          subtext={`${activeOrgs.length} Active / Trialing`}
          accentColor="#1A73E8"
          icon={<Building2 className="w-4 h-4" />}
        />

        <MetricCard
          label="Enrolled Students"
          value={totalPlatformStudents}
          subtext="Across all tenant databases"
          accentColor="#FFA000"
          icon={<Users className="w-4 h-4" />}
        />

        <MetricCard
          label="SaaS Renewal Health"
          value="97.2%"
          subtext="Zero database leak incidents"
          accentColor="#188038"
          icon={<ShieldCheck className="w-4 h-4" />}
        />
      </Reveal>

      {/* User Role Distribution Visualization Card */}
      <UserRoleDistributionCard />

      {/* Organizations Management Table */}
      <DataTable
        columns={[
          {
            key: 'name',
            header: 'Organization & City',
            sortable: true,
            render: (org) => (
              <div>
                <div className="font-bold text-sm text-[#202124] dark:text-[#E8EAED]">{org.name}</div>
                <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                  {org.city}, {org.state} · {org.branches.length} branch(es)
                </div>
              </div>
            )
          },
          {
            key: 'ownerName',
            header: 'Owner Contact',
            render: (org) => (
              <div>
                <div className="font-semibold text-[#202124] dark:text-[#E8EAED]">{org.ownerName}</div>
                <div className="text-[11px] font-mono text-[#5F6368] dark:text-[#9AA0A6]">{org.phone}</div>
              </div>
            )
          },
          {
            key: 'planId',
            header: 'Current Plan',
            render: (org) => (
              <select
                value={org.planId}
                onChange={e => changeOrgPlan(org.id, e.target.value as any)}
                className="bg-[#F1F3F4] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-[#202124] dark:text-[#E8EAED] font-semibold text-xs rounded-lg px-2.5 py-1 focus:outline-none"
              >
                <option value="starter">Starter Batch (₹599/mo)</option>
                <option value="growth">Growth Academy (₹1,299/mo)</option>
                <option value="pro">Multi-Branch Pro (₹2,199/mo)</option>
              </select>
            )
          },
          {
            key: 'studentQuota',
            header: 'Student Quota',
            render: (org) => {
              const orgStudentsCount = students.filter(s => s.orgId === org.id).length;
              return (
                <div>
                  <div className="font-mono font-semibold text-xs text-[#202124] dark:text-[#E8EAED]">
                    {orgStudentsCount} / {org.maxStudents}
                  </div>
                  <div className="w-24 h-1.5 bg-[#F1F3F4] dark:bg-[#282A2C] rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-[#FFA000] rounded-full"
                      style={{ width: `${Math.min(100, (orgStudentsCount / org.maxStudents) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            }
          },
          {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (org) => {
              const isSuspended = org.subscriptionStatus === 'suspended';
              return (
                <StatusChip
                  label={org.subscriptionStatus}
                  variant={isSuspended ? 'error' : org.subscriptionStatus === 'trial' ? 'info' : 'success'}
                  size="xs"
                />
              );
            }
          },
          {
            key: 'actions',
            header: '',
            align: 'right',
            render: (org) => {
              const isSuspended = org.subscriptionStatus === 'suspended';
              return (
                <div className="flex items-center justify-end space-x-1.5">
                  <ConsoleButton
                    variant="secondary"
                    size="xs"
                    onClick={() => handleImpersonateCenter(org.id)}
                  >
                    Access Center
                  </ConsoleButton>
                  <ConsoleButton
                    variant={isSuspended ? 'primary' : 'danger'}
                    size="xs"
                    onClick={() => toggleOrgStatus(org.id, isSuspended ? 'active' : 'suspended')}
                  >
                    {isSuspended ? 'Reactivate' : 'Suspend'}
                  </ConsoleButton>
                </div>
              );
            }
          }
        ]}
        data={filteredOrgs}
        keyExtractor={(org) => org.id}
        searchPlaceholder="Filter centers by name, owner, city..."
        onSearchChange={setSearchQuery}
        toolbarActions={
          <ConsoleButton
            variant="blue"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowNewOrgModal(true)}
          >
            Onboard Center
          </ConsoleButton>
        }
      />

      {/* Subscription Plans Card Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold font-google-sans text-[#202124] dark:text-[#E8EAED]">
            SaaS Subscription Tiers
          </h2>
          <span className="text-[10px] uppercase tracking-[0.14em] text-[#86868B] font-semibold">
            Pricing
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subscriptionPlans.map(plan => (
            <ConsoleCard
              key={plan.id}
              title={plan.name}
              action={
                plan.popular ? (
                  <StatusChip label="POPULAR" variant="warning" size="xs" />
                ) : null
              }
              className={plan.popular ? 'ring-1 ring-[#FFA000]/30 shadow-[0_14px_30px_rgba(255,160,0,0.12)]' : ''}
            >
              <div className="space-y-3">
                <div className="text-2xl font-bold font-google-sans text-[#202124] dark:text-[#E8EAED] leading-none">
                  ₹{(plan.priceMonthly ?? 0).toLocaleString('en-IN')}{' '}
                  <span className="text-xs font-normal text-[#5F6368] dark:text-[#9AA0A6]">/month</span>
                </div>
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed min-h-[44px]">
                  {plan.description}
                </p>
                <div className="text-xs text-[#5F6368] dark:text-[#9AA0A6] rounded-xl bg-[#F8F9FA] dark:bg-[#1A1B1C] px-2.5 py-2 border border-black/[0.04] dark:border-white/[0.06]">
                  Max Students: <strong className="text-[#202124] dark:text-white">{plan.maxStudents}</strong> · Branches: <strong className="text-[#202124] dark:text-white">{plan.maxBranches}</strong>
                </div>
                <ul className="text-xs space-y-1.5 text-[#5F6368] dark:text-[#9AA0A6] border-t border-[#DADCE0] dark:border-[#3C4043] pt-3">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-[#188038] dark:text-[#81C995] flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ConsoleCard>
          ))}
        </div>
      </div>

      {/* Onboard New Org Modal */}
      <AnimatePresence>
        {showNewOrgModal && (
          <motion.div
            key="onboard-org-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: easings.outQuart }}
          >
            <motion.div
              variants={orgPanelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#1E1F20] w-full max-w-md rounded-2xl p-6 shadow-xl border border-[#DADCE0] dark:border-[#3C4043] space-y-4"
            >
              <motion.h3 variants={fadeUp} className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
                Onboard New Coaching & Education Center
              </motion.h3>
              <motion.form
                variants={staggerContainerFast}
                onSubmit={handleCreateOrg}
                className="space-y-3 text-xs"
              >
                <motion.div variants={fadeUp}>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                  Institute / Center Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gurukul Science Classes"
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                />
                </motion.div>

                <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                    Director / Owner Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Joshi"
                    value={newOrgOwner}
                    onChange={e => setNewOrgOwner(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                    Mobile (+91)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98971 00000"
                    value={newOrgPhone}
                    onChange={e => setNewOrgPhone(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                </motion.div>

                <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={newOrgCity}
                    onChange={e => setNewOrgCity(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">SaaS Plan</label>
                  <select
                    value={newOrgPlan}
                    onChange={e => setNewOrgPlan(e.target.value as any)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-medium"
                  >
                    <option value="starter">Starter Batch (₹599/mo)</option>
                    <option value="growth">Growth Academy (₹1,299/mo)</option>
                    <option value="pro">Multi-Branch Pro (₹2,199/mo)</option>
                  </select>
                </div>
                </motion.div>

                <motion.div variants={fadeUp} className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
                  <ConsoleButton
                    type="button"
                    variant="ghost"
                    onClick={() => setShowNewOrgModal(false)}
                  >
                    Cancel
                  </ConsoleButton>
                  <ConsoleButton
                    type="submit"
                    variant="primary"
                  >
                    Create Organization
                  </ConsoleButton>
                </motion.div>
              </motion.form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
