import { promptChoice, promptConfirm, promptExact, promptText } from './utils.mjs'

async function importActions() {
  const module = await import('./cli.mjs')
  return module.managementActions
}

async function chooseAdmin(actions, repoRoot) {
  const payload = actions.listAdmins(repoRoot)
  const admins = payload.admins || []
  if (admins.length === 0) {
    console.log('\n当前没有可操作的管理员。')
    return null
  }
  const index = await promptChoice(
    '请选择管理员',
    admins.map((item) => `${item.name} / ${item.phone} / ${item.type}`),
    0,
  )
  return admins[index] || null
}

async function showOverviewMenu(actions, repoRoot) {
  while (true) {
    await actions.showOverview(repoRoot)
    const choice = await promptChoice('系统总览', ['刷新', '返回主菜单'], 1)
    if (choice === 1) {
      return
    }
  }
}

async function showStackMenu(repoRoot) {
  const { runCli } = await import('./cli.mjs')
  while (true) {
    const choice = await promptChoice('服务栈管理', [
      '启动核心服务',
      '启动完整服务',
      '停止服务',
      '重建并重启',
      '查看容器状态',
      '查看单服务日志',
      '查看最近错误日志',
      '输出 Compose 配置',
      '返回主菜单',
    ], 0)

    switch (choice) {
      case 0:
        await runCli(['stack', 'up-core'], repoRoot)
        break
      case 1:
        await runCli(['stack', 'up-all'], repoRoot)
        break
      case 2:
        await runCli(['stack', 'down'], repoRoot)
        break
      case 3:
        await runCli(['stack', 'restart'], repoRoot)
        break
      case 4:
        await runCli(['stack', 'ps'], repoRoot)
        break
      case 5: {
        const service = await promptText('输入服务名（留空查看全栈日志）', '')
        const argv = service ? ['stack', 'logs', service, '--tail=200'] : ['stack', 'logs', '--tail=200']
        await runCli(argv, repoRoot)
        break
      }
      case 6:
        await runCli(['stack', 'errors', '--tail=200'], repoRoot)
        break
      case 7:
        await runCli(['stack', 'config'], repoRoot)
        break
      default:
        return
    }
  }
}

async function showSecurityMenu(actions, repoRoot) {
  while (true) {
    const choice = await promptChoice('初始化与安全', [
      '查看 bootstrap 信息',
      '重新生成 bootstrap 信息',
      '查看敏感二次验证信息',
      '重新生成敏感二次验证信息',
      '导出敏感配置快照',
      '仅重置初始化凭据',
      '恢复出厂',
      '返回主菜单',
    ], 0)

    switch (choice) {
      case 0:
        await import('./cli.mjs').then((module) => module.runCli(['security', 'show-bootstrap'], repoRoot))
        break
      case 1:
        if (await promptConfirm('确认重新生成 bootstrap 信息吗？', false)) {
          const result = await actions.rotateBootstrap(repoRoot)
          console.log(`新 bootstrap 手机号：${result.generated.bootstrapAdminPhone}`)
          console.log(`新 bootstrap 密码：${result.generated.bootstrapAdminPassword}`)
        }
        break
      case 2:
        await import('./cli.mjs').then((module) => module.runCli(['security', 'show-verify'], repoRoot))
        break
      case 3:
        if (await promptConfirm('确认重新生成敏感二次验证信息吗？', false)) {
          const result = await actions.rotateVerifyCredentials(repoRoot)
          console.log(`新系统日志验证账号：${result.generated.systemLogDeleteAccount}`)
          console.log(`新系统日志验证密码：${result.generated.systemLogDeletePassword}`)
          console.log(`新全量清空验证账号：${result.generated.clearAllDataVerifyAccount}`)
          console.log(`新全量清空验证密码：${result.generated.clearAllDataVerifyPassword}`)
        }
        break
      case 4:
        await actions.exportCurrentConfig(repoRoot)
        break
      case 5:
        if (await promptConfirm('确认仅重置初始化凭据吗？', false)) {
          const result = await actions.resetInit(repoRoot)
          console.log(`新 bootstrap 手机号：${result.generated.bootstrapAdminPhone}`)
          console.log(`新 bootstrap 密码：${result.generated.bootstrapAdminPassword}`)
        }
        break
      case 6:
        if (await promptExact('请输入确认文本', 'RESET INFINITECH DATA')) {
          const result = await actions.resetFactory(repoRoot)
          console.log(`已删除数据卷：${result.removedVolumes.join(', ') || '无'}`)
          console.log(`新 bootstrap 手机号：${result.generated.bootstrapAdminPhone}`)
          console.log(`新 bootstrap 密码：${result.generated.bootstrapAdminPassword}`)
        } else {
          console.log('确认文本不匹配，已取消恢复出厂。')
        }
        break
      default:
        return
    }
  }
}

async function showAdminMenu(actions, repoRoot) {
  while (true) {
    const choice = await promptChoice('管理员管理', [
      '列出管理员',
      '查看管理员详情',
      '创建管理员',
      '更新管理员',
      '重置管理员密码',
      '删除管理员',
      '返回主菜单',
    ], 0)

    switch (choice) {
      case 0:
        actions.listAdmins(repoRoot)
        break
      case 1: {
        const admin = await chooseAdmin(actions, repoRoot)
        if (admin) {
          actions.showAdmin(repoRoot, { id: admin.id })
        }
        break
      }
      case 2: {
        const phone = await promptText('输入管理员手机号', '')
        const name = await promptText('输入管理员姓名', '')
        const type = await promptText('输入管理员类型 admin/super_admin', 'admin')
        const autoGenerate = await promptConfirm('是否自动生成高强度临时密码？', true)
        const password = autoGenerate ? '' : await promptText('输入管理员密码', '')
        actions.createAdmin(repoRoot, {
          phone,
          name,
          type,
          password,
          generate: autoGenerate,
        })
        break
      }
      case 3: {
        const admin = await chooseAdmin(actions, repoRoot)
        if (!admin) {
          break
        }
        const phone = await promptText('输入新的手机号（留空保持不变）', '')
        const name = await promptText('输入新的姓名（留空保持不变）', '')
        const type = await promptText('输入新的类型（留空保持不变）', '')
        actions.updateAdmin(repoRoot, {
          selector: { id: admin.id },
          newPhone: phone,
          name,
          type,
        })
        break
      }
      case 4: {
        const admin = await chooseAdmin(actions, repoRoot)
        if (!admin) {
          break
        }
        const autoGenerate = await promptConfirm('是否自动生成高强度临时密码？', true)
        const password = autoGenerate ? '' : await promptText('输入新密码', '')
        actions.resetAdminPassword(repoRoot, {
          selector: { id: admin.id },
          confirm: String(admin.id),
          password,
          generate: autoGenerate,
        })
        break
      }
      case 5: {
        const admin = await chooseAdmin(actions, repoRoot)
        if (!admin) {
          break
        }
        if (await promptExact(`删除管理员 ${admin.phone} 前请输入其 ID`, String(admin.id))) {
          actions.deleteAdmin(repoRoot, {
            selector: { id: admin.id },
            confirm: String(admin.id),
          })
        } else {
          console.log('确认信息不匹配，已取消删除。')
        }
        break
      }
      default:
        return
    }
  }
}

async function showProxyMenu(actions, repoRoot) {
  while (true) {
    const state = actions.getRuntimeState(repoRoot)
    console.log(`\n当前官网域名：${state.envValues.PUBLIC_DOMAIN || '-'}`)
    console.log(`当前后台域名：${state.envValues.ADMIN_DOMAIN || '-'}`)
    console.log(`当前证书邮箱：${state.envValues.CADDY_EMAIL || '-'}`)
    console.log(`当前反代 HTTP 端口：${state.envValues.REVERSE_PROXY_HTTP_PORT || '80'}`)
    console.log(`当前反代 HTTPS 端口：${state.envValues.REVERSE_PROXY_HTTPS_PORT || '443'}`)
    const choice = await promptChoice('反向代理与域名', [
      '配置/更新反代域名',
      '停用反代',
      '返回主菜单',
    ], 0)

    switch (choice) {
      case 0: {
        const publicDomain = await promptText('输入官网域名', state.envValues.PUBLIC_DOMAIN || 'www.example.com')
        const adminDomain = await promptText('输入后台域名', state.envValues.ADMIN_DOMAIN || `admin.${publicDomain}`)
        const caddyEmail = await promptText('输入证书邮箱', state.envValues.CADDY_EMAIL || 'ops@example.com')
        const httpPort = await promptText('输入反代 HTTP 端口', state.envValues.REVERSE_PROXY_HTTP_PORT || '80')
        const httpsPort = await promptText('输入反代 HTTPS 端口', state.envValues.REVERSE_PROXY_HTTPS_PORT || '443')
        await actions.configureProxy(repoRoot, { publicDomain, adminDomain, caddyEmail, httpPort, httpsPort })
        break
      }
      case 1:
        if (await promptConfirm('确认停用反代并切回宿主端口直连吗？', false)) {
          await actions.disableProxy(repoRoot)
        }
        break
      default:
        return
    }
  }
}

async function showPortsMenu(actions, repoRoot) {
  while (true) {
    const state = actions.getRuntimeState(repoRoot)
    const keys = actions.getKnownHostPortKeys(repoRoot)
    const choice = await promptChoice('端口与网络', [
      ...keys.map((key) => {
        const meta = actions.getConfigMeta(key, repoRoot)
        return `${meta?.label || key}: ${state.envValues[key] || meta?.defaultHint || '(空)'}`
      }),
      '返回主菜单',
    ], 0)

    if (choice >= keys.length) {
      return
    }

    const key = keys[choice]
    const meta = actions.getConfigMeta(key, repoRoot)
    const nextValue = await promptText(`输入新的 ${meta?.label || key}`, state.envValues[key] || meta?.defaultHint || '')
    await actions.editHostPorts(repoRoot, { [key]: nextValue })
  }
}

async function showConfigCenterMenu(actions, repoRoot) {
  while (true) {
    const groups = actions.listCommonConfigByGroup(repoRoot)
    const choice = await promptChoice('运行时配置中心', [
      ...groups.map((group) => `${group.group} (${group.items.length})`),
      '高级变量总表',
      '返回主菜单',
    ], 0)

    if (choice === groups.length + 1) {
      return
    }

    if (choice === groups.length) {
      const key = await promptText('输入要查看/修改的变量名', '')
      if (!key) {
        continue
      }
      const state = actions.getRuntimeState(repoRoot)
      const meta = actions.getConfigMeta(key, repoRoot)
      if (meta?.description) {
        console.log(`说明：${meta.description}`)
      }
      console.log(`当前值：${actions.describeEnvValue(repoRoot, key, state.envValues[key]) || meta?.defaultHint || '(空)'}`)
      const mode = await promptChoice('高级变量操作', ['设置/更新', '取消设置', '恢复默认建议值', '返回'], 0)
      if (mode === 0) {
        const value = await promptText(`输入 ${key} 的新值`, state.envValues[key] || meta?.defaultHint || '')
        await actions.setEnv(repoRoot, key, value)
      } else if (mode === 1) {
        await actions.unsetEnv(repoRoot, key)
      } else if (mode === 2) {
        await actions.restoreEnvDefault(repoRoot, key)
      }
      continue
    }

    const group = groups[choice]
    const state = actions.getRuntimeState(repoRoot)
    const itemChoice = await promptChoice(
      `${group.group}`,
      [
        ...group.items.map((item) => `${item.label}: ${actions.describeEnvValue(repoRoot, item.key, state.envValues[item.key]) || item.defaultHint || '(空)'}`),
        '返回',
      ],
      0,
    )
    if (itemChoice >= group.items.length) {
      continue
    }
    const item = group.items[itemChoice]
    const nextValue = await promptText(`输入 ${item.label} 的新值`, state.envValues[item.key] || item.defaultHint || '')
    await actions.setEnv(repoRoot, item.key, nextValue)
  }
}

async function showDoctorMenu(actions, repoRoot) {
  while (true) {
    const choice = await promptChoice('日志、诊断与健康检查', [
      '运行 doctor',
      '查看容器状态',
      '查看单服务最近 200 行日志',
      '打印 Compose 配置',
      '返回主菜单',
    ], 0)
    switch (choice) {
      case 0: {
        const report = await actions.runDoctor(repoRoot)
        for (const item of report.checks) {
          console.log(`[${item.status}] ${item.title}: ${item.detail}`)
        }
        break
      }
      case 1:
        actions.composePs(repoRoot, {
          envFile: actions.getRuntimeState(repoRoot).runtimeEnvPath,
          profiles: [],
        })
        break
      case 2: {
        const service = await promptText('输入服务名', '')
        actions.composeLogs(repoRoot, {
          envFile: actions.getRuntimeState(repoRoot).runtimeEnvPath,
          profiles: [],
          services: service ? [service] : [],
          follow: false,
          tail: 200,
        })
        break
      }
      case 3:
        actions.composeConfig(repoRoot, {
          envFile: actions.getRuntimeState(repoRoot).runtimeEnvPath,
          profiles: [],
        })
        break
      default:
        return
    }
  }
}

async function showBackupMenu(actions, repoRoot) {
  while (true) {
    const backups = actions.listEnvBackups(repoRoot)
    const choice = await promptChoice('备份、恢复与重置', [
      '查看备份列表',
      '预览备份差异',
      '恢复指定 env 备份',
      '仅恢复某些变量',
      '仅重置初始化凭据',
      '恢复出厂',
      '返回主菜单',
    ], 0)

    switch (choice) {
      case 0:
        backups.forEach((item) => console.log(`- ${item}`))
        break
      case 1: {
        if (backups.length === 0) {
          console.log('当前没有可预览的 env 备份。')
          break
        }
        const backupIndex = await promptChoice('选择要预览的备份', backups, 0)
        await actions.previewBackup(repoRoot, backups[backupIndex])
        break
      }
      case 2: {
        if (backups.length === 0) {
          console.log('当前没有可恢复的 env 备份。')
          break
        }
        const backupIndex = await promptChoice('选择要恢复的备份', backups, 0)
        await actions.restoreEnv(repoRoot, backups[backupIndex])
        break
      }
      case 3: {
        if (backups.length === 0) {
          console.log('当前没有可恢复的 env 备份。')
          break
        }
        const backupIndex = await promptChoice('选择备份', backups, 0)
        const rawKeys = await promptText('输入要恢复的变量名，多个用逗号分隔', '')
        const keys = rawKeys.split(',').map((item) => item.trim()).filter(Boolean)
        if (keys.length === 0) {
          console.log('没有输入变量名，已取消。')
          break
        }
        await actions.previewBackup(repoRoot, backups[backupIndex], keys)
        if (await promptConfirm('确认恢复这些变量吗？', false)) {
          await actions.restorePartialEnv(repoRoot, backups[backupIndex], keys)
        }
        break
      }
      case 4:
        if (await promptConfirm('确认仅重置初始化凭据吗？', false)) {
          await actions.resetInit(repoRoot)
        }
        break
      case 5:
        if (await promptExact('请输入确认文本', 'RESET INFINITECH DATA')) {
          await actions.resetFactory(repoRoot)
        } else {
          console.log('确认文本不匹配，已取消恢复出厂。')
        }
        break
      default:
        return
    }
  }
}

async function showAdvancedMenu(actions, repoRoot) {
  while (true) {
    const choice = await promptChoice('高级工具', [
      '打开 env 文本编辑模式',
      '导出当前敏感配置快照',
      '打印安装器状态',
      '重新安装全局命令',
      '修复 PATH',
      '修复 Docker 兼容模式',
      '返回主菜单',
    ], 0)

    switch (choice) {
      case 0:
        await actions.editEnvInEditor(repoRoot)
        break
      case 1:
        await actions.exportCurrentConfig(repoRoot)
        break
      case 2:
        actions.printInstallerStatus(repoRoot)
        break
      case 3:
        await actions.runRepairScope(repoRoot, 'launcher')
        break
      case 4:
        await actions.runRepairScope(repoRoot, 'path')
        break
      case 5:
        await actions.runDockerCompatRepair(repoRoot)
        break
      default:
        return
    }
  }
}

export async function runMainMenu(repoRoot) {
  const actions = await importActions()
  while (true) {
    const choice = await promptChoice('Infinitech 系统管理菜单', [
      '系统总览',
      '服务栈管理',
      '初始化与安全',
      '管理员管理',
      '反向代理与域名',
      '端口与网络',
      '运行时配置中心',
      '日志、诊断与健康检查',
      '备份、恢复与重置',
      '高级工具',
      '退出',
    ], 0)

    switch (choice) {
      case 0:
        await showOverviewMenu(actions, repoRoot)
        break
      case 1:
        await showStackMenu(repoRoot)
        break
      case 2:
        await showSecurityMenu(actions, repoRoot)
        break
      case 3:
        await showAdminMenu(actions, repoRoot)
        break
      case 4:
        await showProxyMenu(actions, repoRoot)
        break
      case 5:
        await showPortsMenu(actions, repoRoot)
        break
      case 6:
        await showConfigCenterMenu(actions, repoRoot)
        break
      case 7:
        await showDoctorMenu(actions, repoRoot)
        break
      case 8:
        await showBackupMenu(actions, repoRoot)
        break
      case 9:
        await showAdvancedMenu(actions, repoRoot)
        break
      default:
        return
    }
  }
}
